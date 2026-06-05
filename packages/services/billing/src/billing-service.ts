/**
 * Switchboard Billing Service
 *
 * Handles payments, subscriptions, and billing operations with Stripe
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import Joi from 'joi';

import {
  BaseService,
  ServiceConfig,
  ServiceError,
  ErrorCode,
  DatabaseConnectionManager,
  Logger,
  MetricsCollector
} from '@switchboard/services-shared';

export interface BillingServiceConfig extends ServiceConfig {
  stripe: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
  };
  database?: {
    url: string;
    options?: any;
  };
  pricing: {
    plans: {
      [key: string]: {
        priceId: string;
        name: string;
        price: number;
        currency: string;
        interval: 'month' | 'year';
        features: string[];
      };
    };
  };
}

export interface Customer {
  id: string;
  userId: string;
  stripeCustomerId: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  stripeSubscriptionId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  customerId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  createdAt: Date;
}

export class BillingService extends BaseService {
  private app: Application;
  private server: any;
  private stripe: Stripe;
  private databaseManager?: DatabaseConnectionManager;
  private customerModel: any;
  private subscriptionModel: any;
  private paymentModel: any;

  constructor(config: BillingServiceConfig) {
    super(config);
    this.app = express();

    // Initialize Stripe
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16'
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initialize the billing service
   */
  protected async initialize(): Promise<void> {
    const config = this.config as BillingServiceConfig;

    // Initialize database if configured
    if (config.database?.url) {
      await this.initializeDatabase();
    }

    // Add health checks
    if (this.healthChecker) {
      this.healthChecker.addCheck({
        name: 'stripe-connection',
        description: 'Stripe API connectivity',
        required: true,
        timeout: 5000,
        check: async () => {
          try {
            await this.stripe.customers.list({ limit: 1 });
            return {
              status: 'healthy',
              message: 'Stripe API accessible',
              timestamp: new Date()
            };
          } catch (error) {
            return {
              status: 'unhealthy',
              message: `Stripe API error: ${String(error)}`,
              timestamp: new Date()
            };
          }
        }
      });
    }

    this.logger.info('Billing service initialized successfully');
  }

  /**
   * Initialize database for billing data
   */
  private async initializeDatabase(): Promise<void> {
    const config = this.config as BillingServiceConfig;

    this.databaseManager = new DatabaseConnectionManager({
      uri: config.database!.url,
      options: config.database!.options || {},
      logger: this.logger,
      retryAttempts: 3,
      retryDelay: 1000
    });

    await this.databaseManager.connect();

    // Define schemas
    const customerSchema = {
      id: { type: String, required: true, unique: true },
      userId: { type: String, required: true, index: true },
      stripeCustomerId: { type: String, required: true, unique: true },
      email: { type: String, required: true },
      name: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    };

    const subscriptionSchema = {
      id: { type: String, required: true, unique: true },
      customerId: { type: String, required: true, index: true },
      stripeSubscriptionId: { type: String, required: true, unique: true },
      planId: { type: String, required: true },
      status: { type: String, required: true, index: true },
      currentPeriodStart: { type: Date, required: true },
      currentPeriodEnd: { type: Date, required: true },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    };

    const paymentSchema = {
      id: { type: String, required: true, unique: true },
      customerId: { type: String, required: true, index: true },
      stripePaymentIntentId: { type: String, required: true, unique: true },
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
      status: { type: String, required: true, index: true },
      description: { type: String },
      createdAt: { type: Date, default: Date.now }
    };

    this.customerModel = this.databaseManager.getModel('Customer', customerSchema);
    this.subscriptionModel = this.databaseManager.getModel('Subscription', subscriptionSchema);
    this.paymentModel = this.databaseManager.getModel('Payment', paymentSchema);

    this.logger.info('Billing database initialized successfully');
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.httpRequest(req.method, req.path, res.statusCode, duration);

        this.metricsCollector?.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        );
      });

      next();
    });
  }

  /**
   * Setup billing routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (_req: Request, res: Response) => {
      try {
        const health = await this.getHealth();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        this.logger.error('Health check failed', error);
        res.status(500).json({
          status: 'unhealthy',
          message: 'Health check failed',
          timestamp: new Date()
        });
      }
    });

    // Service info
    this.app.get('/info', (_req: Request, res: Response) => {
      res.json(this.getInfo());
    });

    // Billing API routes
    this.setupBillingRoutes();
  }

  /**
   * Setup main billing routes
   */
  private setupBillingRoutes(): void {
    const billingRouter = express.Router();

    // Create customer
    billingRouter.post('/customers', this.validateCreateCustomerRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, email, name } = req.body;
        const timer = this.metricsCollector?.createTimer();

        // Create Stripe customer
        const stripeCustomer = await this.stripe.customers.create({
          email,
          name,
          metadata: { userId }
        });

        // Store in database if available
        let customer: Customer | null = null;
        if (this.customerModel) {
          const customerData = {
            id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            stripeCustomerId: stripeCustomer.id,
            email,
            name,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          customer = await this.customerModel.create(customerData);
        }

        this.metricsCollector?.recordBillingOperation('create-customer', true, timer?.() || 0);

        res.status(201).json({
          success: true,
          data: {
            id: customer?.id || stripeCustomer.id,
            stripeCustomerId: stripeCustomer.id,
            email,
            name,
            createdAt: new Date()
          }
        });

      } catch (error) {
        this.metricsCollector?.recordBillingOperation('create-customer', false, 0);
        next(error);
      }
    });

    // Create subscription
    billingRouter.post('/subscriptions', this.validateCreateSubscriptionRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { customerId, planId } = req.body;
        const timer = this.metricsCollector?.createTimer();
        const config = this.config as BillingServiceConfig;

        // Get customer
        const customer = this.customerModel ?
          await this.customerModel.findOne({ id: customerId }) :
          await this.stripe.customers.retrieve(customerId);

        if (!customer) {
          throw new ServiceError(
            'Customer not found',
            ErrorCode.NOT_FOUND,
            404,
            { customerId },
            this.config.name
          );
        }

        // Get plan details
        const plan = config.pricing.plans[planId];
        if (!plan) {
          throw new ServiceError(
            'Invalid plan',
            ErrorCode.VALIDATION_ERROR,
            400,
            { planId },
            this.config.name
          );
        }

        const stripeCustomerId = this.customerModel ? customer.stripeCustomerId : customerId;

        // Create Stripe subscription
        const stripeSubscription = await this.stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: plan.priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent']
        });

        // Store in database if available
        let subscription: Subscription | null = null;
        if (this.subscriptionModel) {
          const subscriptionData = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            customerId,
            stripeSubscriptionId: stripeSubscription.id,
            planId,
            status: stripeSubscription.status,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          subscription = await this.subscriptionModel.create(subscriptionData);
        }

        this.metricsCollector?.recordBillingOperation('create-subscription', true, timer?.() || 0);

        const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

        res.status(201).json({
          success: true,
          data: {
            id: subscription?.id || stripeSubscription.id,
            stripeSubscriptionId: stripeSubscription.id,
            planId,
            status: stripeSubscription.status,
            clientSecret: paymentIntent?.client_secret,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            createdAt: new Date()
          }
        });

      } catch (error) {
        this.metricsCollector?.recordBillingOperation('create-subscription', false, 0);
        next(error);
      }
    });

    // Create payment intent
    billingRouter.post('/payment-intents', this.validateCreatePaymentRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { customerId, amount, currency = 'usd', description } = req.body;
        const timer = this.metricsCollector?.createTimer();

        // Get customer
        const customer = this.customerModel ?
          await this.customerModel.findOne({ id: customerId }) :
          await this.stripe.customers.retrieve(customerId);

        if (!customer) {
          throw new ServiceError(
            'Customer not found',
            ErrorCode.NOT_FOUND,
            404,
            { customerId },
            this.config.name
          );
        }

        const stripeCustomerId = this.customerModel ? customer.stripeCustomerId : customerId;

        // Create payment intent
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount,
          currency,
          customer: stripeCustomerId,
          description,
          automatic_payment_methods: { enabled: true }
        });

        // Store in database if available
        let payment: Payment | null = null;
        if (this.paymentModel) {
          const paymentData = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            customerId,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            currency,
            status: paymentIntent.status,
            description,
            createdAt: new Date()
          };

          payment = await this.paymentModel.create(paymentData);
        }

        this.metricsCollector?.recordBillingOperation('create-payment', true, timer?.() || 0);

        res.status(201).json({
          success: true,
          data: {
            id: payment?.id || paymentIntent.id,
            stripePaymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount,
            currency,
            status: paymentIntent.status,
            createdAt: new Date()
          }
        });

      } catch (error) {
        this.metricsCollector?.recordBillingOperation('create-payment', false, 0);
        next(error);
      }
    });

    // Get customer subscriptions
    billingRouter.get('/customers/:customerId/subscriptions', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { customerId } = req.params;

        if (this.subscriptionModel) {
          const subscriptions = await this.subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

          res.json({
            success: true,
            data: subscriptions.map((sub: any) => ({
              id: sub.id,
              stripeSubscriptionId: sub.stripeSubscriptionId,
              planId: sub.planId,
              status: sub.status,
              currentPeriodStart: sub.currentPeriodStart,
              currentPeriodEnd: sub.currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              createdAt: sub.createdAt
            }))
          });
        } else {
          // Fallback to Stripe API
          const customer = await this.stripe.customers.retrieve(customerId);
          const subscriptions = await this.stripe.subscriptions.list({
            customer: customerId,
            limit: 100
          });

          res.json({
            success: true,
            data: subscriptions.data.map(sub => ({
              id: sub.id,
              stripeSubscriptionId: sub.id,
              planId: sub.items.data[0]?.price.id || '',
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              createdAt: new Date(sub.created * 1000)
            }))
          });
        }

      } catch (error) {
        next(error);
      }
    });

    // Cancel subscription
    billingRouter.delete('/subscriptions/:subscriptionId', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { subscriptionId } = req.params;
        const { cancelAtPeriodEnd = true } = req.query;
        const timer = this.metricsCollector?.createTimer();

        // Get subscription
        let stripeSubscriptionId = subscriptionId;
        if (this.subscriptionModel) {
          const subscription = await this.subscriptionModel.findOne({ id: subscriptionId });
          if (subscription) {
            stripeSubscriptionId = subscription.stripeSubscriptionId;
          }
        }

        // Update Stripe subscription
        const stripeSubscription = await this.stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: cancelAtPeriodEnd === 'true'
        });

        // Update database if available
        if (this.subscriptionModel) {
          await this.subscriptionModel.updateOne(
            { id: subscriptionId },
            {
              status: stripeSubscription.status,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
              updatedAt: new Date()
            }
          );
        }

        this.metricsCollector?.recordBillingOperation('cancel-subscription', true, timer?.() || 0);

        res.json({
          success: true,
          message: cancelAtPeriodEnd === 'true' ? 'Subscription will cancel at period end' : 'Subscription cancelled immediately'
        });

      } catch (error) {
        this.metricsCollector?.recordBillingOperation('cancel-subscription', false, 0);
        next(error);
      }
    });

    // Stripe webhook handler
    billingRouter.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const config = this.config as BillingServiceConfig;
        const sig = req.headers['stripe-signature'] as string;

        let event;
        try {
          event = this.stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
        } catch (err) {
          this.logger.warn(`Webhook signature verification failed: ${String(err)}`);
          return res.status(400).send(`Webhook Error: ${String(err)}`);
        }

        // Handle the event
        switch (event.type) {
          case 'payment_intent.succeeded':
            await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
            break;
          case 'payment_intent.payment_failed':
            await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
            break;
          case 'customer.subscription.updated':
            await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;
          case 'customer.subscription.deleted':
            await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;
          default:
            this.logger.info(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

      } catch (error) {
        next(error);
      }
    });

    // Get available plans
    billingRouter.get('/plans', (_req: Request, res: Response) => {
      const config = this.config as BillingServiceConfig;

      res.json({
        success: true,
        data: Object.entries(config.pricing.plans).map(([planId, plan]) => ({
          id: planId,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features,
          priceId: plan.priceId
        }))
      });
    });

    this.app.use('/api/v1/billing', billingRouter);
  }

  /**
   * Handle successful payment webhook
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      if (this.paymentModel) {
        await this.paymentModel.updateOne(
          { stripePaymentIntentId: paymentIntent.id },
          {
            status: paymentIntent.status,
            updatedAt: new Date()
          }
        );
      }

      this.logger.info('Payment succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });

    } catch (error) {
      this.logger.error('Failed to handle payment succeeded webhook', error);
    }
  }

  /**
   * Handle failed payment webhook
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      if (this.paymentModel) {
        await this.paymentModel.updateOne(
          { stripePaymentIntentId: paymentIntent.id },
          {
            status: paymentIntent.status,
            updatedAt: new Date()
          }
        );
      }

      this.logger.warn('Payment failed', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });

    } catch (error) {
      this.logger.error('Failed to handle payment failed webhook', error);
    }
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      if (this.subscriptionModel) {
        await this.subscriptionModel.updateOne(
          { stripeSubscriptionId: subscription.id },
          {
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date()
          }
        );
      }

      this.logger.info('Subscription updated', {
        subscriptionId: subscription.id,
        status: subscription.status
      });

    } catch (error) {
      this.logger.error('Failed to handle subscription updated webhook', error);
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      if (this.subscriptionModel) {
        await this.subscriptionModel.updateOne(
          { stripeSubscriptionId: subscription.id },
          {
            status: 'canceled',
            updatedAt: new Date()
          }
        );
      }

      this.logger.info('Subscription deleted', {
        subscriptionId: subscription.id
      });

    } catch (error) {
      this.logger.error('Failed to handle subscription deleted webhook', error);
    }
  }

  /**
   * Validation middleware for create customer requests
   */
  private validateCreateCustomerRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      userId: Joi.string().required(),
      email: Joi.string().email().required(),
      name: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `Customer validation error: ${error.details.map(d => d.message).join(', ')}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        { validationErrors: error.details },
        this.config.name
      ));
    }

    req.body = value;
    next();
  };

  /**
   * Validation middleware for create subscription requests
   */
  private validateCreateSubscriptionRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      customerId: Joi.string().required(),
      planId: Joi.string().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `Subscription validation error: ${error.details.map(d => d.message).join(', ')}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        { validationErrors: error.details },
        this.config.name
      ));
    }

    req.body = value;
    next();
  };

  /**
   * Validation middleware for create payment requests
   */
  private validateCreatePaymentRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      customerId: Joi.string().required(),
      amount: Joi.number().min(50).required(), // Minimum $0.50
      currency: Joi.string().length(3).default('usd'),
      description: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `Payment validation error: ${error.details.map(d => d.message).join(', ')}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        { validationErrors: error.details },
        this.config.name
      ));
    }

    req.body = value;
    next();
  };

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date()
        }
      });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
      this.metricsCollector?.recordError(
        error.code || 'UNKNOWN_ERROR',
        `${req.method} ${req.path}`
      );

      if (error instanceof ServiceError) {
        this.logger.error('Billing API error', error, {
          path: req.path,
          method: req.method
        });

        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: error.timestamp
          }
        });
      }

      // Stripe errors
      if (error.type && error.type.startsWith('Stripe')) {
        this.logger.error('Stripe error', error, {
          path: req.path,
          method: req.method
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'STRIPE_ERROR',
            message: error.message,
            timestamp: new Date()
          }
        });
      }

      // Unexpected errors
      this.logger.error('Unexpected billing error', error, {
        path: req.path,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date()
        }
      });
    });
  }

  /**
   * Start the HTTP server
   */
  private startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = this.config.port || 3001;

      this.server = this.app.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info('Billing service started', { port });
          resolve();
        }
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  private stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Billing service stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Service shutdown
   */
  protected async beforeShutdown(): Promise<void> {
    await this.stopServer();
  }

  /**
   * Cleanup resources
   */
  protected async cleanup(): Promise<void> {
    if (this.databaseManager) {
      await this.databaseManager.disconnect();
    }
  }

  /**
   * Start the service and HTTP server
   */
  async start(): Promise<void> {
    await super.start();
    await this.startServer();
  }
}