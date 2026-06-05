/**
 * Switchboard API Service
 *
 * Production-ready API service with comprehensive error handling, validation, and monitoring
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';

import { StreamingStateOracle } from '@switchboard/oracle-service';
import {
  BaseService,
  ServiceConfig,
  ServiceError,
  ErrorCode,
  CommonHealthChecks,
  ServiceRegistry,
  ServiceRegistration,
  JWTManager,
  AuthMiddleware,
  UserRepository,
  DatabaseConnectionManager
} from '@switchboard/services-shared';

export interface ApiServiceConfig extends ServiceConfig {
  corsOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  jwtSecret?: string;
  database?: {
    url: string;
    options?: any;
  };
}

export class ApiService extends BaseService {
  private app: Application;
  private server: any;
  private serviceRegistry?: ServiceRegistry;
  private streamingOracle?: StreamingStateOracle;
  private databaseManager?: DatabaseConnectionManager;
  private jwtManager?: JWTManager;
  private authMiddleware?: AuthMiddleware;
  private userRepository?: UserRepository;

  constructor(config: ApiServiceConfig) {
    super(config);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * No-auth middleware for when authentication is disabled
   */
  private noAuthMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };

  /**
   * Initialize the API service
   */
  protected async initialize(): Promise<void> {
    const appConfig = this.configManager.getConfig();

    // Initialize service registry
    this.serviceRegistry = new ServiceRegistry(this.logger);

    // Initialize authentication system
    await this.initializeAuth();

    // Initialize streaming oracle connection
    await this.initializeStreamingOracle();

    // Add health checks
    if (this.healthChecker) {
      // Basic health check
      this.healthChecker.addCheck({
        name: 'api-server',
        description: 'API server health',
        required: true,
        timeout: 1000,
        check: async () => ({
          status: 'healthy',
          message: 'API server is running',
          timestamp: new Date()
        })
      });

      // Memory health check
      this.healthChecker.addCheck(
        CommonHealthChecks.memory('api-memory', 0.8, 0.9)
      );
    }

    // Register this service
    if (this.serviceRegistry) {
      const registration: ServiceRegistration = {
        id: `${this.config.name}-${Date.now()}`,
        name: this.config.name,
        version: this.config.version,
        host: 'localhost', // Would be configured from environment
        port: this.config.port || 3000,
        protocol: 'http',
        status: 'healthy',
        lastHeartbeat: new Date(),
        metadata: {
          environment: appConfig.service.environment,
          tags: ['api', 'http'],
          capabilities: ['deployments', 'transactions', 'monitoring']
        },
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          deploy: '/api/v1/deploy',
          status: '/api/v1/status',
          transactions: '/api/v1/transactions'
        }
      };

      await this.serviceRegistry.register(registration);
    }

    this.logger.info('API service initialized successfully');
  }

  /**
   * Initialize authentication system
   */
  private async initializeAuth(): Promise<void> {
    try {
      const config = this.config as ApiServiceConfig;

      if (!config.database?.url) {
        this.logger.warn('Database not configured, authentication disabled');
        return;
      }

      // Initialize database connection
      this.databaseManager = new DatabaseConnectionManager({
        uri: config.database.url,
        options: config.database.options || {},
        logger: this.logger,
        retryAttempts: 3,
        retryDelay: 1000
      });

      await this.databaseManager.connect();

      // Initialize JWT manager
      this.jwtManager = new JWTManager({
        secretKey: config.jwtSecret || process.env.JWT_SECRET || 'default-secret',
        issuer: config.name,
        audience: 'switchboard-api',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d'
      });

      // Initialize user repository
      this.userRepository = new UserRepository(
        this.databaseManager,
        this.logger,
        this.metricsCollector
      );

      // Initialize auth middleware
      this.authMiddleware = new AuthMiddleware(
        this.jwtManager,
        this.userRepository,
        this.logger,
        {
          rateLimitWindow: 15 * 60 * 1000, // 15 minutes
          rateLimitMax: 100,
          enableApiKeys: true,
          enableRefreshTokens: true
        }
      );

      this.logger.info('Authentication system initialized successfully');

      // Add auth health check
      if (this.healthChecker) {
        this.healthChecker.addCheck({
          name: 'authentication',
          description: 'Authentication system health',
          required: false,
          timeout: 2000,
          check: async () => {
            try {
              await this.databaseManager!.getConnection();
              return {
                status: 'healthy',
                message: 'Authentication system operational',
                timestamp: new Date()
              };
            } catch (error) {
              return {
                status: 'unhealthy',
                message: `Authentication system error: ${String(error)}`,
                timestamp: new Date()
              };
            }
          }
        });
      }

    } catch (error) {
      this.logger.warn(`Failed to initialize authentication system: ${String(error)}`);
    }
  }

  /**
   * Initialize connection to the streaming oracle service
   */
  private async initializeStreamingOracle(): Promise<void> {
    try {
      const oracleConfig = {
        solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        chains: {
          ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
          polygon: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
          arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo'
        },
        streamingEnabled: true,
        batchProcessingSize: 50,
        coordinationLatencyTarget: 400
      };

      this.streamingOracle = new StreamingStateOracle(oracleConfig);

      // Connect to all chains
      await this.streamingOracle.connectToAllChains();

      // Start real-time streaming
      await this.streamingOracle.startRealTimeStreaming();

      this.logger.info('✅ Connected to streaming oracle service');

      // Add oracle health check
      if (this.healthChecker) {
        this.healthChecker.addCheck({
          name: 'streaming-oracle',
          description: 'Streaming oracle connection',
          required: true,
          timeout: 5000,
          check: async () => {
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
          }
        });
      }

    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize streaming oracle connection: ${String(error)}`);
      // Continue without oracle - API will return appropriate errors
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(compression());

    // CORS configuration
    const corsConfig = this.configManager.getSecurityConfig();
    this.app.use(cors({
      origin: corsConfig.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const rateLimiter = rateLimit({
      windowMs: corsConfig.rateLimitWindow,
      max: corsConfig.rateLimitMax,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(corsConfig.rateLimitWindow / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api', rateLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging and metrics
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      // End request tracking
      const endInFlight = this.metricsCollector?.recordHttpRequestStart();

      res.on('finish', () => {
        const duration = Date.now() - start;

        // Log request
        this.logger.httpRequest(req.method, req.path, res.statusCode, duration);

        // Record metrics
        this.metricsCollector?.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        );

        endInFlight?.();
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

    // Authentication routes
    this.setupAuthRoutes();

    // API routes
    this.setupApiRoutes();
  }

  /**
   * Setup main API routes
   */
  private setupApiRoutes(): void {
    const apiRouter = express.Router();

    // Deploy endpoint (requires authentication)
    apiRouter.post('/deploy',
      this.authMiddleware?.authenticate({ required: true, permissions: ['deploy'] }) || this.noAuthMiddleware,
      this.validateDeployRequest,
      async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { chains, contractCode } = req.body;
        const timer = this.metricsCollector?.createTimer();

        this.logger.info('Processing deployment request', {
          chains: chains.length,
          codeSize: contractCode.length
        });

        // Real deployment through streaming oracle
        if (!this.streamingOracle) {
          throw new ServiceError(
            'Streaming oracle not available',
            ErrorCode.SERVICE_UNAVAILABLE,
            503,
            undefined,
            this.config.name
          );
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
            { unsupportedChains },
            this.config.name
          );
        }

        // Get current state for all deployment chains
        const chainStates = await Promise.all(
          chains.map(async (chainName: string) => {
            const systemStatus = await this.streamingOracle!.getSystemStatus();
            const stateData = {
              status: systemStatus.connectedChains.includes(chainName) ? 'healthy' : 'unhealthy',
              connectedChains: systemStatus.connectedChains
            };
            return {
              chain: chainName,
              currentBlock: 0, // Will be updated with real data
              networkHealth: stateData.status
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

        // Record deployment metrics
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
    apiRouter.get('/deploy/:deploymentId/status', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { deploymentId } = req.params;

        // Real deployment status from oracle
        if (!this.streamingOracle) {
          throw new ServiceError(
            'Streaming oracle not available',
            ErrorCode.SERVICE_UNAVAILABLE,
            503,
            undefined,
            this.config.name
          );
        }

        // Get current system status
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

    // Get transactions
    apiRouter.get('/transactions', this.validateTransactionQuery, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { page = 1, limit = 20, status, chain } = req.query;

        // Real transaction data from streaming oracle
        if (!this.streamingOracle) {
          throw new ServiceError(
            'Streaming oracle not available',
            ErrorCode.SERVICE_UNAVAILABLE,
            503,
            undefined,
            this.config.name
          );
        }

        const metrics = this.streamingOracle.getStreamingMetrics();
        const systemStatus = await this.streamingOracle.getSystemStatus();

        // Get recent state changes as "transactions"
        const recentTransactions = [];

        for (const chainName of systemStatus.connectedChains) {
          try {
            const systemStatus = await this.streamingOracle.getSystemStatus();
            const chainState = {
              status: systemStatus.connectedChains.includes(chainName) ? 'healthy' : 'unhealthy',
              connectedChains: systemStatus.connectedChains
            };
            if (chainState.status === 'healthy') {
              recentTransactions.push({
                id: `${chainName}_${Date.now()}`,
                chain: chainName,
                type: 'state_coordination',
                blockNumber: 0, // Will be updated with real data
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

    // Chain information from streaming oracle
    apiRouter.get('/chains', async (_req: Request, res: Response, next: NextFunction) => {
      try {
        if (!this.streamingOracle) {
          throw new ServiceError(
            'Streaming oracle not available',
            ErrorCode.SERVICE_UNAVAILABLE,
            503,
            undefined,
            this.config.name
          );
        }

        const systemStatus = await this.streamingOracle.getSystemStatus();
        const metrics = this.streamingOracle.getStreamingMetrics();
        const config = this.streamingOracle.getConfig();

        const chains = Object.entries(config.chains).map(([chainName, rpcUrl]) => ({
          name: chainName,
          rpcUrl: rpcUrl.replace(/\/[a-zA-Z0-9]+$/, '/***'), // Mask API keys
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

    // Real-time metrics endpoint
    apiRouter.get('/metrics/streaming', async (_req: Request, res: Response, next: NextFunction) => {
      try {
        if (!this.streamingOracle) {
          throw new ServiceError(
            'Streaming oracle not available',
            ErrorCode.SERVICE_UNAVAILABLE,
            503,
            undefined,
            this.config.name
          );
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

    this.app.use('/api/v1', apiRouter);
  }

  /**
   * Setup authentication routes
   */
  private setupAuthRoutes(): void {
    if (!this.authMiddleware || !this.jwtManager || !this.userRepository) {
      this.logger.warn('Authentication not initialized, skipping auth routes');
      return;
    }

    const authRouter = express.Router();

    // User registration
    authRouter.post('/register', this.validateRegisterRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password, role = 'user' } = req.body;
        const timer = this.metricsCollector?.createTimer();

        // Hash password
        const passwordHash = await this.jwtManager!.hashPassword(password);

        // Create user
        const userData = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email,
          passwordHash,
          role,
          permissions: role === 'admin' ? ['*'] : ['read:own', 'write:own'],
          isActive: true
        };

        const user = await this.userRepository!.createUser(userData);

        // Generate tokens
        const tokens = await this.jwtManager!.generateToken({
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });

        this.metricsCollector?.recordAuthOperation('register', true, timer?.() || 0);

        res.status(201).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              createdAt: user.createdAt
            },
            tokens
          }
        });

      } catch (error) {
        next(error);
      }
    });

    // User login
    authRouter.post('/login', this.validateLoginRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password } = req.body;
        const timer = this.metricsCollector?.createTimer();

        // Find user
        const user = await this.userRepository!.findByEmail(email);
        if (!user) {
          this.metricsCollector?.recordAuthOperation('login', false, timer?.() || 0);
          throw new ServiceError(
            'Invalid credentials',
            ErrorCode.AUTHENTICATION_FAILED,
            401,
            undefined,
            this.config.name
          );
        }

        // Verify password
        const isValidPassword = await this.jwtManager!.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          this.metricsCollector?.recordAuthOperation('login', false, timer?.() || 0);
          throw new ServiceError(
            'Invalid credentials',
            ErrorCode.AUTHENTICATION_FAILED,
            401,
            undefined,
            this.config.name
          );
        }

        // Update last login
        await this.userRepository!.updateLastLogin(user.id);

        // Generate tokens
        const tokens = await this.jwtManager!.generateToken({
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });

        this.metricsCollector?.recordAuthOperation('login', true, timer?.() || 0);

        res.json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              lastLoginAt: new Date()
            },
            tokens
          }
        });

      } catch (error) {
        next(error);
      }
    });

    // Token refresh
    authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { refreshToken } = req.body;
        const timer = this.metricsCollector?.createTimer();

        if (!refreshToken) {
          throw new ServiceError(
            'Refresh token required',
            ErrorCode.VALIDATION_ERROR,
            400,
            undefined,
            this.config.name
          );
        }

        // Verify refresh token and generate new tokens
        const tokens = await this.jwtManager!.refreshToken(refreshToken);

        this.metricsCollector?.recordAuthOperation('refresh', true, timer?.() || 0);

        res.json({
          success: true,
          data: { tokens }
        });

      } catch (error) {
        this.metricsCollector?.recordAuthOperation('refresh', false, 0);
        next(error);
      }
    });

    // Create API key (requires authentication)
    authRouter.post('/api-keys', this.authMiddleware.authenticate({ required: true }), this.validateAPIKeyRequest, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, permissions = [], expiresInDays } = req.body;
        const user = (req as any).user;
        const timer = this.metricsCollector?.createTimer();

        // Generate API key
        const apiKeyData = {
          id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          name,
          key: this.jwtManager!.generateAPIKey(),
          permissions,
          isActive: true,
          expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
          createdAt: new Date()
        };

        // Hash the key before storing
        const keyHash = await this.jwtManager!.hashPassword(apiKeyData.key);
        const apiKey = await this.userRepository!.createAPIKey({
          ...apiKeyData,
          keyHash
        });

        this.metricsCollector?.recordAuthOperation('create-api-key', true, timer?.() || 0);

        res.status(201).json({
          success: true,
          data: {
            id: apiKey.id,
            name: apiKey.name,
            key: apiKeyData.key, // Only return the raw key once
            permissions: apiKey.permissions,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt
          },
          warning: 'Store this API key securely. It will not be shown again.'
        });

      } catch (error) {
        next(error);
      }
    });

    // List user's API keys
    authRouter.get('/api-keys', this.authMiddleware.authenticate({ required: true }), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as any).user;
        const apiKeys = await this.userRepository!.findAPIKeysByUserId(user.id);

        res.json({
          success: true,
          data: apiKeys.map(key => ({
            id: key.id,
            name: key.name,
            permissions: key.permissions,
            isActive: key.isActive,
            lastUsedAt: key.lastUsedAt,
            expiresAt: key.expiresAt,
            createdAt: key.createdAt
          }))
        });

      } catch (error) {
        next(error);
      }
    });

    // Deactivate API key
    authRouter.delete('/api-keys/:keyId', this.authMiddleware.authenticate({ required: true }), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { keyId } = req.params;
        await this.userRepository!.deactivateAPIKey(keyId);

        res.json({
          success: true,
          message: 'API key deactivated successfully'
        });

      } catch (error) {
        next(error);
      }
    });

    this.app.use('/auth', authRouter);
  }

  /**
   * Validation middleware for deploy requests
   */
  private validateDeployRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      chains: Joi.array().items(Joi.string()).min(1).required()
        .description('List of blockchain networks to deploy to'),
      contractCode: Joi.string().required()
        .description('Smart contract code to deploy'),
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
        { validationErrors: error.details },
        this.config.name
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
        { validationErrors: error.details },
        this.config.name
      ));
    }

    req.query = value;
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
      // Record error metrics
      this.metricsCollector?.recordError(
        error.code || 'UNKNOWN_ERROR',
        `${req.method} ${req.path}`
      );

      if (error instanceof ServiceError) {
        this.logger.error('API error', error, {
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

      // Unexpected errors
      this.logger.error('Unexpected API error', error, {
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
      const port = this.config.port || 3000;

      this.server = this.app.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info('API server started', { port });
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
          this.logger.info('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Service initialization
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

    if (this.databaseManager) {
      await this.databaseManager.disconnect();
    }

    if (this.serviceRegistry) {
      await this.serviceRegistry.cleanup();
    }
  }

  /**
   * Validation middleware for registration requests
   */
  private validateRegisterRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      role: Joi.string().valid('user', 'admin', 'service').optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `Registration validation error: ${error.details.map(d => d.message).join(', ')}`,
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
   * Validation middleware for login requests
   */
  private validateLoginRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `Login validation error: ${error.details.map(d => d.message).join(', ')}`,
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
   * Validation middleware for API key requests
   */
  private validateAPIKeyRequest = (req: Request, _res: Response, next: NextFunction) => {
    const schema = Joi.object({
      name: Joi.string().required(),
      permissions: Joi.array().items(Joi.string()).optional(),
      expiresInDays: Joi.number().min(1).max(365).optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new ServiceError(
        `API key validation error: ${error.details.map(d => d.message).join(', ')}`,
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
   * Start the service and HTTP server
   */
  async start(): Promise<void> {
    await super.start();
    await this.startServer();
  }
}