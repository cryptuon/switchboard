/**
 * Switchboard Customer API Service
 *
 * Public-facing API for all customer interactions including:
 * - Authentication and user management
 * - Cross-chain deployment requests
 * - Transaction monitoring
 * - Billing and subscriptions
 * - Real-time status updates
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import axios, { AxiosInstance } from 'axios';

import {
  BaseService,
  ServiceConfig,
  ServiceError,
  ErrorCode,
  CommonHealthChecks,
  JWTManager,
  AuthMiddleware,
  UserRepository,
  DatabaseConnectionManager
} from '@switchboard/services-shared';

export interface CustomerApiConfig extends ServiceConfig {
  corsOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  jwtSecret?: string;
  database?: {
    type: 'mongodb' | 'postgresql';
    url: string;
    options?: any;
  };
  coreEngineUrl: string;
}

export class CustomerApiService extends BaseService {
  private app: Application;
  private server: any;
  private coreEngineClient: AxiosInstance;
  private databaseManager?: DatabaseConnectionManager;
  private jwtManager?: JWTManager;
  private authMiddleware?: AuthMiddleware;
  private userRepository?: UserRepository;

  constructor(config: CustomerApiConfig) {
    super(config);
    this.app = express();

    // Initialize Core Engine client
    this.coreEngineClient = axios.create({
      baseURL: config.coreEngineUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'customer-api'
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initialize the Customer API service
   */
  protected async initialize(): Promise<void> {
    const config = this.config as CustomerApiConfig;

    // Initialize authentication system if database is configured
    if (config.database?.url) {
      await this.initializeAuth();
    }

    // Add health checks
    if (this.healthChecker) {
      // API server health check
      this.healthChecker.addCheck({
        name: 'api-server',
        description: 'Customer API server health',
        required: true,
        timeout: 1000,
        check: async () => ({
          status: 'healthy',
          message: 'Customer API server is running',
          timestamp: new Date()
        })
      });

      // Memory health check
      this.healthChecker.addCheck(
        CommonHealthChecks.memory('customer-api-memory', 0.8, 0.9)
      );

      // Core Engine connectivity check
      this.healthChecker.addCheck({
        name: 'core-engine-connectivity',
        description: 'Core Engine service connectivity',
        required: true,
        timeout: 5000,
        check: async () => {
          try {
            const response = await this.coreEngineClient.get('/health');
            return {
              status: response.status === 200 ? 'healthy' : 'unhealthy',
              message: `Core Engine responsive (${response.status})`,
              timestamp: new Date(),
              details: response.data
            };
          } catch (error) {
            return {
              status: 'unhealthy',
              message: `Core Engine unreachable: ${String(error)}`,
              timestamp: new Date()
            };
          }
        }
      });
    }

    this.logger.info('Customer API service initialized successfully');
  }

  /**
   * Initialize authentication system
   */
  private async initializeAuth(): Promise<void> {
    try {
      const config = this.config as CustomerApiConfig;

      if (!config.database?.url) {
        this.logger.warn('Database not configured, authentication disabled');
        return;
      }

      // Initialize database connection
      this.databaseManager = new DatabaseConnectionManager({
        type: config.database.type,
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
        audience: 'switchboard-customer-api',
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

    } catch (error) {
      this.logger.warn(`Failed to initialize authentication system: ${String(error)}`);
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
      const endInFlight = this.metricsCollector?.recordHttpRequestStart();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.httpRequest(req.method, req.path, res.statusCode, duration);
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

    // Main API routes
    this.setupApiRoutes();
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

        const passwordHash = await this.jwtManager!.hashPassword(password);
        const userData = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email,
          passwordHash,
          role,
          permissions: role === 'admin' ? ['*'] : ['read:own', 'write:own'],
          isActive: true
        };

        const user = await this.userRepository!.createUser(userData);
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

        const user = await this.userRepository!.findByEmail(email);
        if (!user) {
          this.metricsCollector?.recordAuthOperation('login', false, timer?.() || 0);
          throw new ServiceError('Invalid credentials', ErrorCode.AUTHENTICATION_FAILED, 401, undefined, this.config.name);
        }

        const isValidPassword = await this.jwtManager!.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          this.metricsCollector?.recordAuthOperation('login', false, timer?.() || 0);
          throw new ServiceError('Invalid credentials', ErrorCode.AUTHENTICATION_FAILED, 401, undefined, this.config.name);
        }

        await this.userRepository!.updateLastLogin(user.id);
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
            user: { id: user.id, email: user.email, role: user.role, lastLoginAt: new Date() },
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
        if (!refreshToken) {
          throw new ServiceError('Refresh token required', ErrorCode.VALIDATION_ERROR, 400, undefined, this.config.name);
        }

        const tokens = await this.jwtManager!.refreshToken(refreshToken);
        res.json({ success: true, data: { tokens } });
      } catch (error) {
        next(error);
      }
    });

    this.app.use('/auth', authRouter);
  }

  /**
   * Setup main API routes
   */
  private setupApiRoutes(): void {
    const apiRouter = express.Router();

    // Cross-chain deployment
    apiRouter.post('/deploy',
      this.authMiddleware?.authenticate({ required: true, permissions: ['deploy'] }) || this.noAuthMiddleware,
      this.validateDeployRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          // Forward to Core Engine
          const response = await this.coreEngineClient.post('/deploy', req.body);
          res.status(response.status).json(response.data);
        } catch (error: any) {
          if (error.response) {
            res.status(error.response.status).json(error.response.data);
          } else {
            next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
          }
        }
      }
    );

    // Deployment status
    apiRouter.get('/deploy/:deploymentId/status', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await this.coreEngineClient.get(`/deploy/${req.params.deploymentId}/status`);
        res.json(response.data);
      } catch (error: any) {
        if (error.response) {
          res.status(error.response.status).json(error.response.data);
        } else {
          next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
        }
      }
    });

    // Chain information
    apiRouter.get('/chains', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await this.coreEngineClient.get('/chains');
        res.json(response.data);
      } catch (error: any) {
        if (error.response) {
          res.status(error.response.status).json(error.response.data);
        } else {
          next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
        }
      }
    });

    // Transactions
    apiRouter.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await this.coreEngineClient.get('/transactions', { params: req.query });
        res.json(response.data);
      } catch (error: any) {
        if (error.response) {
          res.status(error.response.status).json(error.response.data);
        } else {
          next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
        }
      }
    });

    // Streaming metrics
    apiRouter.get('/metrics/streaming', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await this.coreEngineClient.get('/metrics/streaming');
        res.json(response.data);
      } catch (error: any) {
        if (error.response) {
          res.status(error.response.status).json(error.response.data);
        } else {
          next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
        }
      }
    });

    // Billing endpoints (forward to Core Engine)
    apiRouter.post('/billing/customers',
      this.authMiddleware?.authenticate({ required: true }) || this.noAuthMiddleware,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const response = await this.coreEngineClient.post('/billing/customers', req.body);
          res.status(response.status).json(response.data);
        } catch (error: any) {
          if (error.response) {
            res.status(error.response.status).json(error.response.data);
          } else {
            next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
          }
        }
      }
    );

    apiRouter.get('/billing/plans', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await this.coreEngineClient.get('/billing/plans');
        res.json(response.data);
      } catch (error: any) {
        if (error.response) {
          res.status(error.response.status).json(error.response.data);
        } else {
          next(new ServiceError('Core Engine unavailable', ErrorCode.SERVICE_UNAVAILABLE, 503));
        }
      }
    });

    this.app.use('/api/v1', apiRouter);
  }

  /**
   * No-auth middleware for when authentication is disabled
   */
  private noAuthMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };

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
        { validationErrors: error.details },
        this.config.name
      ));
    }

    req.body = value;
    next();
  };

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
        this.logger.error('Customer API error', error, {
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
      this.logger.error('Unexpected Customer API error', error, {
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
          this.logger.info('Customer API server started', { port });
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
          this.logger.info('Customer API server stopped');
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