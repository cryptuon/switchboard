/**
 * ChainSync Core Engine Service
 *
 * Backend service that handles all core functionality:
 * - Blockchain oracle and state coordination
 * - Cross-chain deployment execution
 * - Payment processing and billing
 * - Real-time streaming and metrics
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import Joi from 'joi';
import Stripe from 'stripe';
import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

import {
  BaseService,
  ServiceConfig,
  ServiceError,
  ErrorCode,
  CommonHealthChecks,
  DatabaseConnectionManager
} from '@chainsync/services-shared';

import { StreamingStateOracle } from '../../oracle-service/src/streaming-state-oracle';
import { ConnectorFactory } from '../../oracle-service/src/connector-factory';

export interface CoreEngineConfig extends ServiceConfig {
  database?: {
    type: 'mongodb' | 'postgresql';
    url: string;
    options?: any;
  };
  solanaRpcUrl: string;
  chains: { [chainName: string]: string }; // chainName -> rpcUrl mapping
  streamingEnabled: boolean;
  batchProcessingSize: number;
  coordinationLatencyTarget: number;
  stripe?: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
  };
  pricing?: {
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

export class CoreEngineService extends BaseService {
  private app: Application;
  private server: any;
  private databaseManager?: DatabaseConnectionManager;
  private streamingOracle?: StreamingStateOracle;
  private stripe?: Stripe;

  // Database models
  private deploymentModel: any;
  private transactionModel: any;
  private customerModel: any;
  private subscriptionModel: any;
  private paymentModel: any;
  private sequelize?: Sequelize;

  constructor(config: CoreEngineConfig) {
    super(config);
    this.app = express();

    // Initialize Stripe if configured
    if (config.stripe?.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey, {
        apiVersion: '2023-10-16'
      });
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initialize the Core Engine service
   */
  protected async initialize(): Promise<void> {
    const config = this.config as CoreEngineConfig;

    // Initialize database if configured
    if (config.database?.url) {
      await this.initializeDatabase();
    }

    // Initialize streaming oracle
    await this.initializeStreamingOracle();

    // Add health checks
    if (this.healthChecker) {
      // Core engine health check
      this.healthChecker.addCheck({
        name: 'core-engine',
        description: 'Core engine service health',
        required: true,
        timeout: 1000,
        check: async () => ({
          status: 'healthy',
          message: 'Core engine is running',
          timestamp: new Date()
        })
      });

      // Memory health check
      this.healthChecker.addCheck(
        CommonHealthChecks.memory('core-engine-memory', 0.8, 0.9)
      );

      // Oracle health check
      if (this.streamingOracle) {
        this.healthChecker.addCheck({
          name: 'streaming-oracle',
          description: 'Streaming oracle connection',
          required: true,
          timeout: 5000,
          check: async () => {
            try {
              const systemStatus = await this.streamingOracle!.getSystemStatus();
              const metrics = this.streamingOracle!.getStreamingMetrics();

              return {
                status: systemStatus.performanceStatus === 'critical' ? 'unhealthy' : 'healthy',
                message: `Oracle: ${systemStatus.streamingChains}/${systemStatus.totalChains} chains, ${metrics.latencyStatus} latency`,
                timestamp: new Date(),
                details: {
                  totalChains: systemStatus.totalChains,
                  streamingChains: systemStatus.streamingChains,
                  latencyStatus: metrics.latencyStatus,
                  averageLatency: `${metrics.averageLatency.toFixed(0)}ms`
                }
              };
            } catch (error) {
              return {
                status: 'unhealthy',
                message: `Oracle error: ${String(error)}`,
                timestamp: new Date()
              };
            }
          }
        });
      }

      // Stripe health check
      if (this.stripe) {
        this.healthChecker.addCheck({
          name: 'stripe-connection',
          description: 'Stripe API connectivity',
          required: false,
          timeout: 5000,
          check: async () => {
            try {
              await this.stripe!.customers.list({ limit: 1 });
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
    }

    this.logger.info('Core Engine service initialized successfully');
  }

  /**
   * Initialize database for core data storage
   */
  private async initializeDatabase(): Promise<void> {
    const config = this.config as CoreEngineConfig;

    this.databaseManager = new DatabaseConnectionManager({
      type: config.database!.type,
      uri: config.database!.url,
      options: config.database!.options || {},
      logger: this.logger,
      retryAttempts: 3,
      retryDelay: 1000
    });

    await this.databaseManager.connect();

    // Define schemas based on database type
    if (config.database!.type === 'postgresql') {
      await this.initializePostgreSQLSchemas();
    } else {
      await this.initializeMongoDBSchemas();
    }

    this.logger.info('Core Engine database initialized successfully');
  }

  /**
   * Initialize PostgreSQL schemas
   */
  private async initializePostgreSQLSchemas(): Promise<void> {
    const config = this.config as CoreEngineConfig;

    this.sequelize = new Sequelize(config.database!.url, {
      dialect: 'postgres',
      logging: (msg) => this.logger.debug('PostgreSQL:', { query: msg }),
      ...config.database!.options
    });

    // Test connection
    await this.sequelize.authenticate();
    this.logger.info('PostgreSQL connection established successfully');

    // Define Deployment model
    const Deployment = this.sequelize.define('Deployment', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      deploymentId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      chains: {
        type: DataTypes.JSON,
        allowNull: false
      },
      contractCode: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true
      }
    });

    // Define Transaction model
    const Transaction = this.sequelize.define('Transaction', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      deploymentId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      chain: {
        type: DataTypes.STRING,
        allowNull: false
      },
      txHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      blockNumber: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    });

    // Define Customer model
    const Customer = this.sequelize.define('Customer', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      }
    });

    // Define Subscription model
    const Subscription = this.sequelize.define('Subscription', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      stripeSubscriptionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      planId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      currentPeriodStart: {
        type: DataTypes.DATE,
        allowNull: false
      },
      currentPeriodEnd: {
        type: DataTypes.DATE,
        allowNull: false
      },
      cancelAtPeriodEnd: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    });

    // Define Payment model
    const Payment = this.sequelize.define('Payment', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      stripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      }
    });

    // Set up associations
    Transaction.belongsTo(Deployment, { foreignKey: 'deploymentId', as: 'deployment' });
    Deployment.hasMany(Transaction, { foreignKey: 'deploymentId', as: 'transactions' });

    Subscription.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
    Customer.hasMany(Subscription, { foreignKey: 'customerId', as: 'subscriptions' });

    Payment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
    Customer.hasMany(Payment, { foreignKey: 'customerId', as: 'payments' });

    // Create tables if they don't exist
    await this.sequelize.sync({ alter: true });

    // Assign models
    this.deploymentModel = Deployment;
    this.transactionModel = Transaction;
    this.customerModel = Customer;
    this.subscriptionModel = Subscription;
    this.paymentModel = Payment;

    this.logger.info('PostgreSQL schemas initialized successfully');
  }

  /**
   * Initialize MongoDB schemas
   */
  private async initializeMongoDBSchemas(): Promise<void> {
    const deploymentSchema = {
      id: { type: String, required: true, unique: true },
      deploymentId: { type: String, required: true, unique: true },
      status: { type: String, required: true },
      chains: [{ type: String }],
      contractCode: { type: String, required: true },
      config: { type: Object },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    };

    const transactionSchema = {
      id: { type: String, required: true, unique: true },
      deploymentId: { type: String, required: true, index: true },
      chain: { type: String, required: true },
      txHash: { type: String, required: true },
      status: { type: String, required: true },
      blockNumber: { type: Number },
      createdAt: { type: Date, default: Date.now }
    };

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

    this.deploymentModel = this.databaseManager!.getModel('Deployment', deploymentSchema);
    this.transactionModel = this.databaseManager!.getModel('Transaction', transactionSchema);
    this.customerModel = this.databaseManager!.getModel('Customer', customerSchema);
    this.subscriptionModel = this.databaseManager!.getModel('Subscription', subscriptionSchema);
    this.paymentModel = this.databaseManager!.getModel('Payment', paymentSchema);
  }

  /**
   * Create mock model for PostgreSQL (placeholder)
   */
  private createMockModel(modelName: string) {
    return {
      create: async (data: any) => ({ ...data, id: `${modelName.toLowerCase()}_${Date.now()}` }),
      findOne: async (query: any) => null,
      find: async (query: any) => [],
      updateOne: async (query: any, update: any) => ({ modifiedCount: 1 }),
      deleteMany: async (query: any) => ({ deletedCount: 0 })
    };
  }

  /**
   * Initialize connection to the streaming oracle service
   */
  private async initializeStreamingOracle(): Promise<void> {
    try {
      const config = this.config as CoreEngineConfig;

      this.streamingOracle = new StreamingStateOracle({
        solanaRpcUrl: config.solanaRpcUrl,
        chains: config.chains,
        streamingEnabled: config.streamingEnabled,
        batchProcessingSize: config.batchProcessingSize,
        coordinationLatencyTarget: config.coordinationLatencyTarget
      });

      // Connect to all chains
      await this.streamingOracle.connectToAllChains();

      // Start real-time streaming
      await this.streamingOracle.startRealTimeStreaming();

      this.logger.info('✅ Streaming oracle service initialized');
    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize streaming oracle: ${String(error)}`);
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(compression());

    // CORS configuration (internal service, more permissive)
    this.app.use(cors({
      origin: true, // Allow all origins for internal service
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Service-Name']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
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

    // Metrics endpoint
    this.app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        if (!this.metricsCollector) {
          return res.status(404).json({ error: 'Metrics not enabled' });
        }
        const metrics = await this.metricsCollector.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        this.logger.error('Failed to get metrics', error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Service info endpoint
    this.app.get('/info', (_req: Request, res: Response) => {
      res.json(this.getInfo());
    });

    // Core API routes
    this.setupCoreRoutes();

    // Billing routes
    this.setupBillingRoutes();
  }

  /**
   * Setup core blockchain functionality routes
   */
  private setupCoreRoutes(): void {
    // Deploy endpoint
    this.app.post('/deploy', this.validateDeployRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { chains, contractCode, config: deployConfig } = req.body;
        const timer = this.metricsCollector?.createTimer();

        this.logger.info('Processing deployment request', {
          chains: chains.length,
          codeSize: contractCode.length
        });

        if (!this.streamingOracle) {
          throw new ServiceError('Streaming oracle not available', ErrorCode.SERVICE_UNAVAILABLE, 503);
        }

        const deploymentId = `deploy_${Date.now()}`;

        // Validate chains are supported
        const supportedChains = this.streamingOracle.getConfig().chains;
        const unsupportedChains = chains.filter((chain: string) => !supportedChains[chain.toLowerCase()]);

        if (unsupportedChains.length > 0) {
          throw new ServiceError(
            `Unsupported chains: ${unsupportedChains.join(', ')}`,
            ErrorCode.VALIDATION_ERROR,
            400,
            { unsupportedChains }
          );
        }

        // Store deployment in database
        if (this.deploymentModel) {
          await this.deploymentModel.create({
            id: deploymentId,
            deploymentId,
            status: 'initiated',
            chains,
            contractCode,
            config: deployConfig,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Get current state for all deployment chains
        const chainStates = await Promise.all(
          chains.map(async (chainName: string) => {
            const systemStatus = await this.streamingOracle!.getSystemStatus();
            return {
              chain: chainName,
              currentBlock: 0,
              networkHealth: systemStatus.connectedChains.includes(chainName) ? 'healthy' : 'unhealthy'
            };
          })
        );

        const result = {
          deploymentId,
          status: 'initiated',
          chains: chainStates,
          timestamp: new Date(),
          estimatedCompletionTime: new Date(Date.now() + 30000),
          coordinationLatency: this.streamingOracle.getStreamingMetrics().averageLatency
        };

        this.metricsCollector?.recordDeployment('success', chains.length, timer?.() || 0);

        res.status(202).json({
          success: true,
          data: result
        });

      } catch (error) {
        next(error);
      }
    });

    // Get deployment status
    this.app.get('/deploy/:deploymentId/status', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { deploymentId } = req.params;

        if (!this.streamingOracle) {
          throw new ServiceError('Streaming oracle not available', ErrorCode.SERVICE_UNAVAILABLE, 503);
        }

        const systemStatus = await this.streamingOracle.getSystemStatus();
        const metrics = this.streamingOracle.getStreamingMetrics();

        const status = {
          deploymentId,
          status: systemStatus.performanceStatus === 'critical' ? 'failed' : 'completed',
          chains: systemStatus.connectedChains.map(chainName => ({
            name: chainName,
            status: systemStatus.connectedChains.includes(chainName) ? 'healthy' : 'unhealthy',
            lastBlock: systemStatus.streamingMetrics.bufferSizes[chainName] || 0,
            latency: `${metrics.averageLatency.toFixed(0)}ms`
          })),
          completedAt: new Date(),
          performance: {
            totalChains: systemStatus.totalChains,
            streamingChains: systemStatus.streamingChains,
            latencyStatus: metrics.latencyStatus,
            coordinationTime: `${metrics.coordinationTime}ms`
          }
        };

        res.json({
          success: true,
          data: status
        });

      } catch (error) {
        next(error);
      }
    });

    // Chain information
    this.app.get('/chains', async (_req: Request, res: Response, next: NextFunction) => {
      try {
        if (!this.streamingOracle) {
          throw new ServiceError('Streaming oracle not available', ErrorCode.SERVICE_UNAVAILABLE, 503);
        }

        const systemStatus = await this.streamingOracle.getSystemStatus();
        const metrics = this.streamingOracle.getStreamingMetrics();
        const config = this.streamingOracle.getConfig();

        const chains = Object.entries(config.chains).map(([chainName, rpcUrl]) => ({
          name: chainName,
          rpcUrl: rpcUrl.replace(/\/[a-zA-Z0-9]+$/, '/***'),
          chainId: this.getChainId(chainName),
          status: systemStatus.connectedChains.includes(chainName) ? 'healthy' : 'unhealthy',
          isStreaming: systemStatus.connectedChains.includes(chainName),
          bufferSize: metrics.bufferSizes[chainName] || 0,
          lastSyncedBlock: systemStatus.streamingMetrics.bufferSizes[chainName] || 0
        }));

        res.json({
          success: true,
          data: {
            chains,
            summary: {
              totalChains: systemStatus.totalChains,
              streamingChains: systemStatus.streamingChains,
              performanceStatus: systemStatus.performanceStatus,
              averageLatency: `${metrics.averageLatency.toFixed(0)}ms`,
              coordinationTarget: `${config.coordinationLatencyTarget}ms`,
              lastCoordinationTime: systemStatus.lastCoordinationTime
            }
          }
        });

      } catch (error) {
        next(error);
      }
    });

    // Get transactions
    this.app.get('/transactions', this.validateTransactionQuery, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { page = 1, limit = 20, status, chain } = req.query;

        if (!this.streamingOracle) {
          throw new ServiceError('Streaming oracle not available', ErrorCode.SERVICE_UNAVAILABLE, 503);
        }

        const metrics = this.streamingOracle.getStreamingMetrics();
        const systemStatus = await this.streamingOracle.getSystemStatus();

        // Get recent state changes as "transactions"
        const recentTransactions = [];

        for (const chainName of systemStatus.connectedChains) {
          try {
            if (systemStatus.connectedChains.includes(chainName)) {
              recentTransactions.push({
                id: `${chainName}_${Date.now()}`,
                chain: chainName,
                type: 'state_coordination',
                blockNumber: 0,
                blockHash: '',
                timestamp: new Date(),
                status: 'completed',
                transactionCount: 1
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to get transactions for ${chainName}: ${String(error)}`);
          }
        }

        // Apply filters
        let filteredTransactions = recentTransactions;
        if (chain) {
          filteredTransactions = filteredTransactions.filter(tx => tx.chain === chain);
        }
        if (status) {
          filteredTransactions = filteredTransactions.filter(tx => tx.status === status);
        }

        // Pagination
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedData = filteredTransactions.slice(startIndex, endIndex);

        const transactions = {
          data: paginatedData,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: filteredTransactions.length,
            pages: Math.ceil(filteredTransactions.length / Number(limit)),
            hasNext: endIndex < filteredTransactions.length,
            hasPrev: Number(page) > 1
          },
          streaming: {
            totalEvents: metrics.totalEvents,
            eventsPerSecond: metrics.eventsPerSecond.toFixed(2),
            latencyStatus: metrics.latencyStatus,
            coordinationQueueSize: metrics.coordinationQueueSize
          }
        };

        res.json({
          success: true,
          data: transactions
        });

      } catch (error) {
        next(error);
      }
    });

    // Real-time metrics endpoint
    this.app.get('/metrics/streaming', async (_req: Request, res: Response, next: NextFunction) => {
      try {
        if (!this.streamingOracle) {
          throw new ServiceError('Streaming oracle not available', ErrorCode.SERVICE_UNAVAILABLE, 503);
        }

        const metrics = this.streamingOracle.getStreamingMetrics();
        const systemStatus = await this.streamingOracle.getSystemStatus();

        res.json({
          success: true,
          data: {
            performance: {
              totalEvents: metrics.totalEvents,
              eventsPerSecond: metrics.eventsPerSecond,
              averageLatency: metrics.averageLatency,
              coordinationTime: metrics.coordinationTime,
              latencyStatus: metrics.latencyStatus
            },
            system: {
              totalChains: systemStatus.totalChains,
              streamingChains: systemStatus.streamingChains,
              performanceStatus: systemStatus.performanceStatus,
              solanaConnectionStatus: systemStatus.solanaConnectionStatus
            },
            queues: {
              coordinationQueueSize: metrics.coordinationQueueSize,
              bufferSizes: metrics.bufferSizes
            },
            timestamp: new Date()
          }
        });

      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup billing routes
   */
  private setupBillingRoutes(): void {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, skipping billing routes');
      return;
    }

    const config = this.config as CoreEngineConfig;

    // Get available plans
    this.app.get('/billing/plans', (_req: Request, res: Response) => {
      if (!config.pricing?.plans) {
        return res.json({ success: true, data: [] });
      }

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

    // Create customer
    this.app.post('/billing/customers', this.validateCreateCustomerRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, email, name } = req.body;
        const timer = this.metricsCollector?.createTimer();

        // Create Stripe customer
        const stripeCustomer = await this.stripe!.customers.create({
          email,
          name,
          metadata: { userId }
        });

        // Store in database if available
        let customer: any = null;
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

    // Additional billing endpoints would go here...
  }

  /**
   * Helper to get chain ID from chain name
   */
  private getChainId(chainName: string): number {
    const chainIds: { [key: string]: number } = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      bsc: 56,
      avalanche: 43114,
      fantom: 250
    };

    return chainIds[chainName.toLowerCase()] || 0;
  }

  /**
   * Validation middleware for deploy requests
   */
  private validateDeployRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      chains: Joi.array().items(Joi.string()).min(1).required(),
      contractCode: Joi.string().required(),
      config: Joi.object({
        gasLimit: Joi.number().min(21000).optional(),
        gasPrice: Joi.string().optional(),
        constructorArgs: Joi.array().optional()
      }).optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `Validation error: ${error.details.map(d => d.message).join(', ')}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        { validationErrors: error.details }
      ));
    }

    req.body = value;
    next();
  };

  /**
   * Validation middleware for transaction queries
   */
  private validateTransactionQuery = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(100).optional(),
      status: Joi.string().valid('pending', 'completed', 'failed').optional(),
      chain: Joi.string().optional(),
      from: Joi.date().optional(),
      to: Joi.date().optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return next(new ServiceError(
        `Query validation error: ${error.details.map(d => d.message).join(', ')}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        { validationErrors: error.details }
      ));
    }

    req.query = value;
    next();
  };

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
        { validationErrors: error.details }
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
        this.logger.error('Core Engine error', error, {
          path: req.path,
          method: req.method,
          body: req.body
        });

        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: error.timestamp,
            ...(this.configManager.isDevelopment() && { details: error.details })
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
      this.logger.error('Unexpected Core Engine error', error, {
        path: req.path,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: this.configManager.isDevelopment() ? error.message : 'Internal server error',
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
          this.logger.info('Core Engine server started', { port });
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
          this.logger.info('Core Engine server stopped');
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
    if (this.streamingOracle) {
      await this.streamingOracle.stopStreaming();
    }

    if (this.sequelize) {
      await this.sequelize.close();
      this.logger.info('PostgreSQL connection closed');
    }

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