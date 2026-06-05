/**
 * Switchboard Storage Module
 *
 * Unified storage abstraction with multi-database support
 */

// Core storage components
export { StorageManager, StorageConfig, StorageType, DataRouting } from './storage-manager';

// Storage adapter interfaces
export {
  StorageAdapter,
  DocumentStorageAdapter,
  RelationalStorageAdapter,
  TimeSeriesStorageAdapter,
  CacheStorageAdapter,
  ConnectionConfig,
  QueryOptions,
  PaginationOptions,
  PaginatedResult,
  BulkWriteOptions,
  TimeSeriesQuery,
  StorageAdapterFactory,
  StorageHealthCheck
} from './interfaces/storage-adapter';

// Database adapters
export { MongoDBAdapter } from './adapters/mongodb-adapter';
export { PostgreSQLAdapter } from './adapters/postgresql-adapter';
export { ClickHouseAdapter } from './adapters/clickhouse-adapter';
export { DuckDBAdapter } from './adapters/duckdb-adapter';
// export { RedisAdapter } from './adapters/redis-adapter'; // Not implemented

// Repository layer
export { BaseRepository, RepositoryOptions } from './repositories/base-repository';

// Concrete repositories
export { DeploymentRepository, Deployment } from './repositories/deployment-repository';
export { BlockchainEventRepository, BlockchainEvent } from './repositories/blockchain-event-repository';
export { SessionRepository, UserSession } from './repositories/session-repository';

/**
 * Storage Configuration Factory
 */
export class StorageConfigFactory {
  /**
   * Create configuration for MongoDB + ClickHouse setup
   */
  static createMongoClickHouse(config: {
    mongodb: {
      host: string;
      port?: number;
      database: string;
      username?: string;
      password?: string;
      ssl?: boolean;
    };
    clickhouse: {
      host: string;
      port?: number;
      database: string;
      username?: string;
      password?: string;
    };
    redis?: {
      host: string;
      port?: number;
      password?: string;
    };
  }): StorageConfig {
    const storageConfig: StorageConfig = {
      primary: {
        type: 'mongodb',
        config: {
          host: config.mongodb.host,
          port: config.mongodb.port || 27017,
          database: config.mongodb.database,
          username: config.mongodb.username,
          password: config.mongodb.password,
          ssl: config.mongodb.ssl
        }
      },
      analytics: {
        type: 'clickhouse',
        config: {
          host: config.clickhouse.host,
          port: config.clickhouse.port || 8123,
          database: config.clickhouse.database,
          username: config.clickhouse.username,
          password: config.clickhouse.password
        }
      }
    };

    if (config.redis) {
      storageConfig.cache = {
        type: 'redis',
        config: {
          host: config.redis.host,
          port: config.redis.port || 6379,
          database: '0',
          password: config.redis.password
        }
      };
    }

    return storageConfig;
  }

  /**
   * Create configuration for PostgreSQL + DuckDB setup
   */
  static createPostgresDuckDB(config: {
    postgresql: {
      host: string;
      port?: number;
      database: string;
      username: string;
      password: string;
      ssl?: boolean;
    };
    duckdb: {
      database: string; // File path or :memory:
    };
    redis?: {
      host: string;
      port?: number;
      password?: string;
    };
  }): StorageConfig {
    const storageConfig: StorageConfig = {
      primary: {
        type: 'postgresql',
        config: {
          host: config.postgresql.host,
          port: config.postgresql.port || 5432,
          database: config.postgresql.database,
          username: config.postgresql.username,
          password: config.postgresql.password,
          ssl: config.postgresql.ssl
        }
      },
      analytics: {
        type: 'duckdb',
        config: {
          host: 'localhost',
          port: 0,
          database: config.duckdb.database
        }
      }
    };

    if (config.redis) {
      storageConfig.cache = {
        type: 'redis',
        config: {
          host: config.redis.host,
          port: config.redis.port || 6379,
          database: '0',
          password: config.redis.password
        }
      };
    }

    return storageConfig;
  }

  /**
   * Create configuration for development (all in-memory/local)
   */
  static createDevelopment(): StorageConfig {
    return {
      primary: {
        type: 'mongodb',
        config: {
          host: 'localhost',
          port: 27017,
          database: 'chainsynk_dev'
        }
      },
      analytics: {
        type: 'duckdb',
        config: {
          host: 'localhost',
          port: 0,
          database: ':memory:'
        }
      },
      cache: {
        type: 'redis',
        config: {
          host: 'localhost',
          port: 6379,
          database: '0'
        }
      }
    };
  }
}