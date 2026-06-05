/**
 * Main application file for Switchboard Billing Service
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { UserService } from './services/user.service';
import { BillingCalculator } from './services/billing.calculator';
import { SubscriptionManager } from './services/subscription.manager';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';

interface BillingConfig {
  port: number;
  stripeSecretKey?: string;
  databaseUrl: string;
}

export class BillingService {
  private app: Express;
  private config: BillingConfig;
  private userService: UserService;
  private billingCalculator: BillingCalculator;
  private subscriptionManager: SubscriptionManager;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private stripeService: StripeService;

  constructor(config: BillingConfig) {
    this.app = express();
    this.config = config;

    // Initialize services
    this.userService = new UserService();
    this.billingCalculator = new BillingCalculator();
    this.subscriptionManager = new SubscriptionManager();
    this.invoiceService = new InvoiceService(this.billingCalculator);
    this.paymentService = new PaymentService(config.stripeSecretKey);
    this.stripeService = new StripeService(config.stripeSecretKey);

    // Initialize middleware
    this.initializeMiddleware();

    // Initialize routes
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'Billing Service OK' });
      // Log the req to use the declared variable
      console.log('Request:', req);
      // Log the stripeService to use the declared variable
      console.log('Stripe Service:', this.stripeService);
    });

    // User management endpoints
    this.app.post('/users', async (req: Request, res: Response) => {
      try {
        const userData = req.body;
        const user = await this.userService.createUser(userData);
        res.status(201).json(user);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
      }
    });

    // Usage tracking endpoint
    this.app.post('/usage', async (req: Request, res: Response) => {
      try {
        const usageData = req.body;
        const usageRecord = await this.userService.recordUsage(usageData);
        res.status(201).json(usageRecord);
      } catch (error) {
        res.status(500).json({ error: 'Failed to track usage' });
      }
    });

    // Subscription management endpoints
    this.app.get('/subscriptions/:userId', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const subscription = await this.subscriptionManager.getActiveSubscription(userId);
        res.status(200).json(subscription);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get subscription' });
      }
    });

    this.app.post('/subscriptions', async (req: Request, res: Response) => {
      try {
        const { userId, tier } = req.body;
        const subscription = await this.subscriptionManager.createSubscription(userId, tier);
        res.status(201).json(subscription);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create subscription' });
      }
    });

    this.app.put('/subscriptions/:userId', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { tier } = req.body;
        const subscription = await this.subscriptionManager.updateSubscriptionTier(userId, tier);
        res.status(200).json(subscription);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update subscription' });
      }
    });

    this.app.delete('/subscriptions/:userId', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const result = await this.subscriptionManager.cancelSubscription(userId);
        res.status(200).json({ success: result });
      } catch (error) {
        res.status(500).json({ error: 'Failed to cancel subscription' });
      }
    });

    // Invoice endpoints
    this.app.get('/invoices/:userId', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const invoices = await this.invoiceService.getUserInvoices(userId);
        res.status(200).json(invoices);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get invoices' });
      }
    });

    this.app.post('/invoices', async (req: Request, res: Response) => {
      try {
        const { userId, usageRecords } = req.body;
        const invoice = await this.invoiceService.generateInvoice(userId, usageRecords);
        res.status(201).json(invoice);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate invoice' });
      }
    });

    this.app.post('/invoices/:invoiceId/pay', async (req: Request, res: Response) => {
      try {
        const { invoiceId } = req.params;
        const invoice = await this.invoiceService.payInvoice(invoiceId);
        res.status(200).json(invoice);
      } catch (error) {
        res.status(500).json({ error: 'Failed to pay invoice' });
      }
    });

    // Payment endpoints
    this.app.post('/payments', async (req: Request, res: Response) => {
      try {
        const { userId, amount, currency, paymentMethodId } = req.body;
        const result = await this.paymentService.processPayment(userId, amount, currency, paymentMethodId);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to process payment' });
      }
    });

    this.app.get('/payments/:paymentId', async (req: Request, res: Response) => {
      try {
        const { paymentId } = req.params;
        const result = await this.paymentService.getPaymentStatus(paymentId);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get payment status' });
      }
    });

    // Billing calculation endpoints
    this.app.post('/calculate-usage', async (req: Request, res: Response) => {
      try {
        const { tier, requests } = req.body;
        const result = this.billingCalculator.calculateMonthlyBill(tier, requests);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to calculate billing' });
      }
    });

    this.app.post('/calculate-transaction-fee', async (req: Request, res: Response) => {
      try {
        const { value, volumeTier } = req.body;
        const result = this.billingCalculator.calculateTransactionFee(value, volumeTier);
        res.status(200).json({ fee: result });
      } catch (error) {
        res.status(500).json({ error: 'Failed to calculate transaction fee' });
      }
    });
  }

  /**
   * Start the billing service
   */
  public start(): void {
    this.app.listen(this.config.port, () => {
      console.log(`Switchboard Billing Service listening on port ${this.config.port}`);
      // Log the config to use the declared variable
      console.log('Config:', this.config);
    });
  }
}