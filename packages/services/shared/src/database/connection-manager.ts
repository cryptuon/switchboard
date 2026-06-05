/**
 * Switchboard Database Connection Manager
 *
 * Provides database connection pooling, transaction management, and query optimization
 */

import mongoose, { Connection, ClientSession } from 'mongoose';
import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { RetryManager } from '../retry/retry-manager';
import { MetricsCollector } from '../metrics/metrics-collector';

export interface DatabaseConfig {
  url: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  minConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  useTransaction?: boolean;
  session?: ClientSession;
}

export interface TransactionResult<T> {
  result: T;
  session: ClientSession;
  committed: boolean;
}

export class DatabaseConnectionManager {
  private connection: Connection | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private activeSessions: Set<ClientSession> = new Set();

  private readonly logger: Logger;
  private readonly config: DatabaseConfig;
  private readonly retryManager: RetryManager;
  private readonly metricsCollector?: MetricsCollector;
  private readonly serviceName: string;

  constructor(
    config: DatabaseConfig,
    serviceName: string,
    logger: Logger,
    retryManager: RetryManager,
    metricsCollector?: MetricsCollector
  ) {
    this.config = config;
    this.serviceName = serviceName;
    this.logger = logger;
    this.retryManager = retryManager;
    this.metricsCollector = metricsCollector;
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.connection) {
      return;
    }

    this.logger.info('Disconnecting from database');

    try {
      // Close all active sessions
      await this.closeActiveSessions();

      // Close connection
      await this.connection.close();
      this.isConnected = false;
      this.connection = null;
      this.connectionPromise = null;

      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
      throw new ServiceError(
        `Failed to disconnect from database: ${String(error)}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        this.serviceName
      );
    }
  }

  /**
   * Get database connection
   */
  getConnection(): Connection {
    if (!this.isConnected || !this.connection) {
      throw new ServiceError(
        'Database not connected',
        ErrorCode.DATABASE_ERROR,
        500,
        {},
        this.serviceName
      );
    }
    return this.connection;
  }

  /**
   * Check if database is connected
   */
  isHealthy(): boolean {
    return this.isConnected && this.connection?.readyState === 1;
  }

  /**
   * Ping database to test connectivity
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.connection) {
        return false;
      }

      await this.connection.db.admin().ping();
      return true;
    } catch (error) {
      this.logger.error('Database ping failed', error);
      return false;
    }
  }

  /**
   * Execute operation within a transaction
   */
  async withTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
    options?: any
  ): Promise<T> {
    const timer = this.metricsCollector?.createTimer();
    let session: ClientSession | null = null;
    let committed = false;

    try {
      await this.ensureConnection();
      session = await this.connection!.startSession();
      this.activeSessions.add(session);

      const result = await session.withTransaction(async () => {
        return await operation(session!);
      }, options);

      committed = true;
      this.metricsCollector?.recordDatabaseOperation('transaction', 'commit', true, timer?.() || 0);

      return result as T;
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('transaction', 'commit', false, timer?.() || 0);

      this.logger.error('Transaction failed', error, {
        committed,
        operation: 'transaction'
      });

      throw new ServiceError(
        `Transaction failed: ${String(error)}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error, committed },
        this.serviceName
      );
    } finally {
      if (session) {
        this.activeSessions.delete(session);
        await session.endSession();
      }
    }
  }

  /**
   * Execute query with retry and metrics
   */
  async executeQuery<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: QueryOptions = {}
  ): Promise<T> {
    const timer = this.metricsCollector?.createTimer();

    try {
      await this.ensureConnection();

      const wrappedOperation = async () => {
        if (options.timeout) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), options.timeout);
          });

          return Promise.race([operation(), timeoutPromise]);
        }
        return operation();
      };

      const result = options.retries !== 0
        ? await this.retryManager.withRetry(wrappedOperation, operationName)
        : await wrappedOperation();

      this.metricsCollector?.recordDatabaseOperation(operationName, 'query', true, timer?.() || 0);
      return result;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(operationName, 'query', false, timer?.() || 0);

      this.logger.error('Database query failed', error, {
        operation: operationName,
        timeout: options.timeout,
        retries: options.retries
      });

      throw new ServiceError(
        `Database query failed: ${String(error)}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error, operation: operationName },
        this.serviceName
      );
    }
  }

  /**
   * Create a new session for manual transaction management
   */
  async createSession(): Promise<ClientSession> {
    await this.ensureConnection();
    const session = await this.connection!.startSession();
    this.activeSessions.add(session);
    return session;
  }

  /**
   * End a session
   */
  async endSession(session: ClientSession): Promise<void> {
    try {
      this.activeSessions.delete(session);
      await session.endSession();
    } catch (error) {
      this.logger.error('Error ending session', error);
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    if (!this.connection) {
      return null;
    }

    return {
      activeSessions: this.activeSessions.size,
      isConnected: this.isConnected,
      readyState: this.connection.readyState,
      states: {
        disconnected: 0,
        connected: 1,
        connecting: 2,
        disconnecting: 3
      }
    };
  }

  /**
   * Set up connection event handlers
   */
  private setupEventHandlers(connection: Connection): void {
    connection.on('connected', () => {
      this.logger.info('Database connected');
      this.isConnected = true;
      this.metricsCollector?.setDatabaseConnections('mongodb', 1);
    });

    connection.on('disconnected', () => {
      this.logger.warn('Database disconnected');
      this.isConnected = false;
      this.metricsCollector?.setDatabaseConnections('mongodb', 0);
    });

    connection.on('reconnected', () => {
      this.logger.info('Database reconnected');
      this.isConnected = true;
      this.metricsCollector?.setDatabaseConnections('mongodb', 1);
    });

    connection.on('error', (error) => {
      this.logger.error('Database connection error', error);
      this.metricsCollector?.recordError('database_connection', 'connection');
    });

    connection.on('close', () => {
      this.logger.info('Database connection closed');
      this.isConnected = false;
      this.metricsCollector?.setDatabaseConnections('mongodb', 0);
    });
  }

  /**
   * Establish database connection
   */
  private async establishConnection(): Promise<void> {
    this.logger.info('Connecting to database', {
      host: this.config.host || 'from-url',
      database: this.config.database || 'from-url'
    });

    try {
      const options = {
        maxPoolSize: this.config.maxConnections || 20,
        minPoolSize: this.config.minConnections || 5,
        maxIdleTimeMS: this.config.idleTimeoutMillis || 30000,
        serverSelectionTimeoutMS: this.config.connectionTimeoutMillis || 5000,
        socketTimeoutMS: this.config.acquireTimeoutMillis || 45000,
        family: 4, // Use IPv4, skip trying IPv6
        ssl: this.config.ssl !== false,
        retryWrites: true,
        retryReads: true,
        bufferMaxEntries: 0,
        bufferCommands: false
      };

      this.connection = await mongoose.createConnection(this.config.url, options);
      this.setupEventHandlers(this.connection);

      // Wait for connection to be ready
      if (this.connection.readyState !== 1) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, this.config.connectionTimeoutMillis || 5000);

          this.connection!.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.connection!.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      this.isConnected = true;
      this.logger.info('Database connection established successfully');

    } catch (error) {
      this.connectionPromise = null;
      this.logger.error('Failed to connect to database', error);

      throw new ServiceError(
        `Failed to connect to database: ${String(error)}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error, config: { ...this.config, password: '[REDACTED]' } },
        this.serviceName
      );
    }
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Close all active sessions
   */
  private async closeActiveSessions(): Promise<void> {
    if (this.activeSessions.size === 0) {
      return;
    }

    this.logger.debug('Closing active database sessions', {
      sessionCount: this.activeSessions.size
    });

    const closePromises = Array.from(this.activeSessions).map(async (session) => {
      try {
        await session.endSession();
      } catch (error) {
        this.logger.error('Error closing session', error);
      }
    });

    await Promise.all(closePromises);
    this.activeSessions.clear();
  }
}

/**
 * Database Health Check Helper
 */
export class DatabaseHealthCheck {
  static create(connectionManager: DatabaseConnectionManager, name: string = 'database') {
    return {
      name,
      description: 'Database connectivity and health',
      required: true,
      timeout: 5000,
      interval: 30000,
      check: async () => {
        const isHealthy = await connectionManager.ping();
        const stats = connectionManager.getPoolStats();

        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          message: isHealthy ? 'Database is connected and responsive' : 'Database is not responding',
          timestamp: new Date(),
          details: {
            connected: connectionManager.isHealthy(),
            poolStats: stats
          }
        };
      }
    };
  }
}