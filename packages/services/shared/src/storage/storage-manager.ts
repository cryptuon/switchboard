/**
 * Switchboard Storage Manager
 *
 * Central storage management with routing to appropriate databases
 */

import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { MetricsCollector } from '../metrics/metrics-collector';
import {
  DocumentStorageAdapter,
  RelationalStorageAdapter,
  TimeSeriesStorageAdapter,
  CacheStorageAdapter,
  ConnectionConfig,
  StorageHealthCheck
} from './interfaces/storage-adapter';

export enum StorageType {
  PRIMARY = 'primary',
  ANALYTICS = 'analytics',
  CACHE = 'cache'
}

export interface StorageConfig {
  // Primary database - choose one
  primary: {
    type: 'mongodb' | 'postgresql';
    config: ConnectionConfig;
  };
  // Analytics/Events database - choose one
  analytics: {
    type: 'clickhouse' | 'duckdb';
    config: ConnectionConfig;
  };
  // Cache - optional
  cache?: {
    type: 'redis';
    config: ConnectionConfig;
  };
}

/**
 * Data routing configuration
 * Defines which data types go to which storage backends
 */
export interface DataRouting {
  // Primary transactional data -> MongoDB or PostgreSQL
  deployments: StorageType.PRIMARY;
  transactions: StorageType.PRIMARY;
  users: StorageType.PRIMARY;
  user_settings: StorageType.PRIMARY;
  api_keys: StorageType.PRIMARY;

  // High-volume analytics and events -> ClickHouse or DuckDB
  blockchain_events: StorageType.ANALYTICS;
  transaction_logs: StorageType.ANALYTICS;
  performance_metrics: StorageType.ANALYTICS;
  block_data: StorageType.ANALYTICS;
  deployment_analytics: StorageType.ANALYTICS;
  user_analytics: StorageType.ANALYTICS;
  financial_reports: StorageType.ANALYTICS;

  // Temporary/session data -> Redis
  user_sessions: StorageType.CACHE;
  rate_limits: StorageType.CACHE;
  temporary_data: StorageType.CACHE;
  pub_sub_events: StorageType.CACHE;
}

export class StorageManager implements StorageHealthCheck {
  private primaryAdapter?: DocumentStorageAdapter | RelationalStorageAdapter;
  private analyticsAdapter?: TimeSeriesStorageAdapter;
  private cacheAdapter?: CacheStorageAdapter;

  private readonly routing: DataRouting = {
    // Primary transactional data
    deployments: StorageType.PRIMARY,
    transactions: StorageType.PRIMARY,
    users: StorageType.PRIMARY,
    user_settings: StorageType.PRIMARY,
    api_keys: StorageType.PRIMARY,

    // Analytics and events data
    blockchain_events: StorageType.ANALYTICS,
    transaction_logs: StorageType.ANALYTICS,
    performance_metrics: StorageType.ANALYTICS,
    block_data: StorageType.ANALYTICS,
    deployment_analytics: StorageType.ANALYTICS,
    user_analytics: StorageType.ANALYTICS,
    financial_reports: StorageType.ANALYTICS,

    // Cache data
    user_sessions: StorageType.CACHE,
    rate_limits: StorageType.CACHE,
    temporary_data: StorageType.CACHE,
    pub_sub_events: StorageType.CACHE,
  };

  constructor(
    private config: StorageConfig,
    private logger: Logger,
    private metricsCollector?: MetricsCollector
  ) {}

  /**
   * Initialize all configured storage adapters
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing storage manager', {
      configuredStores: Object.keys(this.config).length
    });

    const initPromises: Promise<void>[] = [];

    // Initialize primary storage (MongoDB or PostgreSQL)
    initPromises.push(this.initializePrimaryStorage());

    // Initialize analytics storage (ClickHouse or DuckDB)
    initPromises.push(this.initializeAnalyticsStorage());

    // Initialize cache storage (Redis) if configured
    if (this.config.cache) {
      initPromises.push(this.initializeCacheStorage());
    }

    await Promise.all(initPromises);
    this.logger.info('Storage manager initialized successfully');
  }

  /**
   * Cleanup all storage connections
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up storage connections');

    const cleanupPromises: Promise<void>[] = [];

    if (this.primaryAdapter) {
      cleanupPromises.push(this.primaryAdapter.disconnect());
    }

    if (this.analyticsAdapter) {
      cleanupPromises.push(this.analyticsAdapter.disconnect());
    }

    if (this.cacheAdapter) {
      cleanupPromises.push(this.cacheAdapter.disconnect());
    }

    await Promise.allSettled(cleanupPromises);
    this.logger.info('Storage cleanup completed');
  }

  /**
   * Get appropriate storage adapter for data type
   */
  getStorageForDataType(dataType: keyof DataRouting):
    DocumentStorageAdapter | RelationalStorageAdapter | TimeSeriesStorageAdapter | CacheStorageAdapter {

    const storageType = this.routing[dataType];

    switch (storageType) {
      case StorageType.PRIMARY:
        if (!this.primaryAdapter) {
          throw new ServiceError(
            `Primary storage not configured for data type: ${dataType}`,
            ErrorCode.CONFIGURATION_ERROR,
            500,
            { dataType, storageType },
            'storage-manager'
          );
        }
        return this.primaryAdapter;

      case StorageType.ANALYTICS:
        if (!this.analyticsAdapter) {
          throw new ServiceError(
            `Analytics storage not configured for data type: ${dataType}`,
            ErrorCode.CONFIGURATION_ERROR,
            500,
            { dataType, storageType },
            'storage-manager'
          );
        }
        return this.analyticsAdapter;

      case StorageType.CACHE:
        if (!this.cacheAdapter) {
          throw new ServiceError(
            `Cache storage not configured for data type: ${dataType}`,
            ErrorCode.CONFIGURATION_ERROR,
            500,
            { dataType, storageType },
            'storage-manager'
          );
        }
        return this.cacheAdapter;

      default:
        throw new ServiceError(
          `Unknown storage type for data type: ${dataType}`,
          ErrorCode.CONFIGURATION_ERROR,
          500,
          { dataType, storageType },
          'storage-manager'
        );
    }
  }

  /**
   * Get primary storage adapter (MongoDB or PostgreSQL)
   */
  getPrimaryStorage(): DocumentStorageAdapter | RelationalStorageAdapter {
    if (!this.primaryAdapter) {
      throw new ServiceError(
        'Primary storage not configured',
        ErrorCode.CONFIGURATION_ERROR,
        500,
        {},
        'storage-manager'
      );
    }
    return this.primaryAdapter;
  }

  /**
   * Get analytics storage adapter (ClickHouse or DuckDB)
   */
  getAnalyticsStorage(): TimeSeriesStorageAdapter {
    if (!this.analyticsAdapter) {
      throw new ServiceError(
        'Analytics storage not configured',
        ErrorCode.CONFIGURATION_ERROR,
        500,
        {},
        'storage-manager'
      );
    }
    return this.analyticsAdapter;
  }

  /**
   * Get document storage adapter (if primary is document-based)
   */
  getDocumentStorage(): DocumentStorageAdapter {
    const primary = this.getPrimaryStorage();
    if (!this.isDocumentStorage(primary)) {
      throw new ServiceError(
        'Primary storage is not document-based',
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { primaryType: this.config.primary.type },
        'storage-manager'
      );
    }
    return primary as DocumentStorageAdapter;
  }

  /**
   * Get relational storage adapter (if primary is relational-based)
   */
  getRelationalStorage(): RelationalStorageAdapter {
    const primary = this.getPrimaryStorage();
    if (!this.isRelationalStorage(primary)) {
      throw new ServiceError(
        'Primary storage is not relational-based',
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { primaryType: this.config.primary.type },
        'storage-manager'
      );
    }
    return primary as RelationalStorageAdapter;
  }

  /**
   * Get time-series storage adapter (alias for analytics)
   */
  getTimeSeriesStorage(): TimeSeriesStorageAdapter {
    return this.getAnalyticsStorage();
  }

  /**
   * Get cache storage adapter
   */
  getCacheStorage(): CacheStorageAdapter {
    if (!this.cacheAdapter) {
      throw new ServiceError(
        'Cache storage not configured',
        ErrorCode.CONFIGURATION_ERROR,
        500,
        {},
        'storage-manager'
      );
    }
    return this.cacheAdapter;
  }

  /**
   * Health check implementations
   */
  async checkDocumentStorage(): Promise<boolean> {
    try {
      if (this.config.primary.type === 'mongodb') {
        return this.primaryAdapter ? await this.primaryAdapter.isHealthy() : false;
      }
      return false;
    } catch (error) {
      this.logger.error('Document storage health check failed', error);
      return false;
    }
  }

  async checkRelationalStorage(): Promise<boolean> {
    try {
      if (this.config.primary.type === 'postgresql') {
        return this.primaryAdapter ? await this.primaryAdapter.isHealthy() : false;
      }
      return false;
    } catch (error) {
      this.logger.error('Relational storage health check failed', error);
      return false;
    }
  }

  async checkTimeSeriesStorage(): Promise<boolean> {
    try {
      return this.analyticsAdapter ? await this.analyticsAdapter.isHealthy() : false;
    } catch (error) {
      this.logger.error('Time-series storage health check failed', error);
      return false;
    }
  }

  async checkCacheStorage(): Promise<boolean> {
    try {
      return this.cacheAdapter ? await this.cacheAdapter.isHealthy() : false;
    } catch (error) {
      this.logger.error('Cache storage health check failed', error);
      return false;
    }
  }

  async getStorageStats(): Promise<{
    document?: any;
    relational?: any;
    timeSeries?: any;
    cache?: any;
  }> {
    const stats: any = {};

    try {
      if (this.primaryAdapter) {
        const key = this.config.primary.type === 'mongodb' ? 'document' : 'relational';
        stats[key] = await this.primaryAdapter.getStats();
      }
    } catch (error) {
      this.logger.error('Error getting primary storage stats', error);
    }

    try {
      if (this.analyticsAdapter) {
        stats.timeSeries = await this.analyticsAdapter.getStats();
      }
    } catch (error) {
      this.logger.error('Error getting analytics storage stats', error);
    }

    try {
      if (this.cacheAdapter) {
        stats.cache = await this.cacheAdapter.getStats();
      }
    } catch (error) {
      this.logger.error('Error getting cache storage stats', error);
    }

    return stats;
  }

  /**
   * Initialize primary storage (MongoDB or PostgreSQL)
   */
  private async initializePrimaryStorage(): Promise<void> {
    if (this.config.primary.type === 'mongodb') {
      const { MongoDBAdapter } = await import('./adapters/mongodb-adapter');
      this.primaryAdapter = new MongoDBAdapter(
        this.config.primary.config,
        this.logger,
        this.metricsCollector
      );
    } else if (this.config.primary.type === 'postgresql') {
      const { PostgreSQLAdapter } = await import('./adapters/postgresql-adapter');
      this.primaryAdapter = new PostgreSQLAdapter(
        this.config.primary.config,
        this.logger,
        this.metricsCollector
      );
    } else {
      throw new ServiceError(
        `Unsupported primary storage type: ${this.config.primary.type}`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { type: this.config.primary.type },
        'storage-manager'
      );
    }

    await this.primaryAdapter.connect();
    this.logger.info('Primary storage initialized', {
      type: this.config.primary.type
    });
  }

  /**
   * Initialize analytics storage (ClickHouse or DuckDB)
   */
  private async initializeAnalyticsStorage(): Promise<void> {
    if (this.config.analytics.type === 'clickhouse') {
      const { ClickHouseAdapter } = await import('./adapters/clickhouse-adapter');
      this.analyticsAdapter = new ClickHouseAdapter(
        this.config.analytics.config,
        this.logger,
        this.metricsCollector
      );
    } else if (this.config.analytics.type === 'duckdb') {
      const { DuckDBAdapter } = await import('./adapters/duckdb-adapter');
      this.analyticsAdapter = new DuckDBAdapter(
        this.config.analytics.config,
        this.logger,
        this.metricsCollector
      );
    } else {
      throw new ServiceError(
        `Unsupported analytics storage type: ${this.config.analytics.type}`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { type: this.config.analytics.type },
        'storage-manager'
      );
    }

    await this.analyticsAdapter.connect();
    this.logger.info('Analytics storage initialized', {
      type: this.config.analytics.type
    });
  }

  /**
   * Initialize cache storage
   */
  private async initializeCacheStorage(): Promise<void> {
    if (this.config.cache!.type === 'redis') {
      // const { RedisAdapter } = await import('./adapters/redis-adapter');
      throw new Error('Redis adapter not implemented');
      // this.cacheAdapter = new RedisAdapter(
      //   this.config.cache!.config,
      //   this.logger,
      //   this.metricsCollector
      // );
    } else {
      throw new ServiceError(
        `Unsupported cache storage type: ${this.config.cache!.type}`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { type: this.config.cache!.type },
        'storage-manager'
      );
    }

    await this.cacheAdapter.connect();
    this.logger.info('Cache storage initialized', {
      type: this.config.cache!.type
    });
  }

  /**
   * Type guards for storage adapters
   */
  private isDocumentStorage(storage: any): storage is DocumentStorageAdapter {
    return typeof storage.findOne === 'function' && typeof storage.insertOne === 'function';
  }

  private isRelationalStorage(storage: any): storage is RelationalStorageAdapter {
    return typeof storage.query === 'function' && typeof storage.execute === 'function';
  }

  private isTimeSeriesStorage(storage: any): storage is TimeSeriesStorageAdapter {
    return typeof storage.insert === 'function' && typeof storage.queryTimeSeries === 'function';
  }

  private isCacheStorage(storage: any): storage is CacheStorageAdapter {
    return typeof storage.get === 'function' && typeof storage.set === 'function';
  }
}