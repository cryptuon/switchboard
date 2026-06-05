/**
 * Switchboard PostgreSQL Adapter
 *
 * Relational storage adapter optimized for complex relationships and ACID transactions
 */

import { Pool, Client, PoolClient } from 'pg';
import { Logger } from '../../logging/logger';
import { ServiceError, ErrorCode } from '../../errors/service-errors';
import { MetricsCollector } from '../../metrics/metrics-collector';
import {
  RelationalStorageAdapter,
  ConnectionConfig,
  QueryOptions,
  PaginationOptions,
  PaginatedResult
} from '../interfaces/storage-adapter';

export class PostgreSQLAdapter implements RelationalStorageAdapter {
  private pool?: Pool;
  private readonly config: ConnectionConfig;
  private readonly logger: Logger;
  private readonly metricsCollector?: MetricsCollector;

  constructor(
    config: ConnectionConfig,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    this.config = config;
    this.logger = logger;
    this.metricsCollector = metricsCollector;
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.maxConnections || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.logger.info('PostgreSQL connection established', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL', error);
      throw new ServiceError(
        'PostgreSQL connection failed',
        ErrorCode.DATABASE_CONNECTION_ERROR,
        500,
        { config: this.config },
        'postgresql-adapter'
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
      this.logger.info('PostgreSQL connection closed');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.pool) return false;

      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      this.logger.error('PostgreSQL health check failed', error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    return this.isHealthy();
  }

  async getStats(): Promise<any> {
    try {
      if (!this.pool) return null;

      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT
          pg_database_size(current_database()) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
      `);
      client.release();

      return {
        databaseSize: result.rows[0].database_size,
        activeConnections: result.rows[0].active_connections,
        maxConnections: result.rows[0].max_connections,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      };
    } catch (error) {
      this.logger.error('Error getting PostgreSQL stats', error);
      return null;
    }
  }

  async query<T>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.pool) {
        throw new ServiceError(
          'PostgreSQL pool not initialized',
          ErrorCode.DATABASE_CONNECTION_ERROR,
          500,
          {},
          'postgresql-adapter'
        );
      }

      const client = options.session || await this.pool.connect();
      const result = await client.query(sql, params);

      if (!options.session) {
        client.release();
      }

      this.metricsCollector?.recordDatabaseOperation(
        'query',
        'postgresql',
        true,
        timer?.() || 0
      );

      return result.rows as T[];
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'query',
        'postgresql',
        false,
        timer?.() || 0
      );

      this.logger.error('PostgreSQL query failed', error, { sql, params });
      throw new ServiceError(
        'PostgreSQL query failed',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { sql, params, error: error.message },
        'postgresql-adapter'
      );
    }
  }

  async queryOne<T>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<T | null> {
    const results = await this.query<T>(sql, params, options);
    return results.length > 0 ? results[0] : null;
  }

  async execute(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<{ affectedRows: number }> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.pool) {
        throw new ServiceError(
          'PostgreSQL pool not initialized',
          ErrorCode.DATABASE_CONNECTION_ERROR,
          500,
          {},
          'postgresql-adapter'
        );
      }

      const client = options.session || await this.pool.connect();
      const result = await client.query(sql, params);

      if (!options.session) {
        client.release();
      }

      this.metricsCollector?.recordDatabaseOperation(
        'execute',
        'postgresql',
        true,
        timer?.() || 0
      );

      return { affectedRows: result.rowCount || 0 };
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'execute',
        'postgresql',
        false,
        timer?.() || 0
      );

      this.logger.error('PostgreSQL execute failed', error, { sql, params });
      throw new ServiceError(
        'PostgreSQL execute failed',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { sql, params, error: error.message },
        'postgresql-adapter'
      );
    }
  }

  async queryPaginated<T>(
    sql: string,
    params: any[],
    pagination: PaginationOptions = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const offset = pagination.offset || ((page - 1) * limit);

    // Count total records
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
    const countResult = await this.queryOne<{ total: number }>(countSql, params, options);
    const total = countResult?.total || 0;

    // Build sort clause
    let sortClause = '';
    if (pagination.sort) {
      const sortColumns = Object.entries(pagination.sort)
        .map(([column, direction]) => `${column} ${direction === 1 ? 'ASC' : 'DESC'}`)
        .join(', ');
      sortClause = ` ORDER BY ${sortColumns}`;
    }

    // Query with pagination
    const paginatedSql = `${sql}${sortClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const paginatedParams = [...params, limit, offset];

    const data = await this.query<T>(paginatedSql, paginatedParams, options);

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    };
  }

  async prepare(sql: string): Promise<any> {
    if (!this.pool) {
      throw new ServiceError(
        'PostgreSQL pool not initialized',
        ErrorCode.DATABASE_CONNECTION_ERROR,
        500,
        {},
        'postgresql-adapter'
      );
    }

    // PostgreSQL doesn't have explicit prepared statement caching like some databases
    // Return a wrapper that can be used for parameterized queries
    return {
      execute: async (params: any[] = [], options: QueryOptions = {}) => {
        return await this.query(sql, params, options);
      }
    };
  }

  async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new ServiceError(
        'PostgreSQL pool not initialized',
        ErrorCode.DATABASE_CONNECTION_ERROR,
        500,
        {},
        'postgresql-adapter'
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createTable(tableName: string, schema: any): Promise<void> {
    try {
      const columns = schema.columns
        .map((col: any) => `${col.name} ${col.type}${col.constraints || ''}`)
        .join(', ');

      let createSql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns}`;

      if (schema.primaryKey && schema.primaryKey.length > 0) {
        createSql += `, PRIMARY KEY (${schema.primaryKey.join(', ')})`;
      }

      createSql += ')';

      await this.execute(createSql);

      this.logger.info('Table created', { tableName, schema });
    } catch (error) {
      this.logger.error('Failed to create table', error, { tableName, schema });
      throw new ServiceError(
        'Failed to create PostgreSQL table',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { tableName, schema, error: error.message },
        'postgresql-adapter'
      );
    }
  }

  async createIndex(tableName: string, indexSpec: any): Promise<void> {
    try {
      const indexName = indexSpec.name || `idx_${tableName}_${indexSpec.columns.join('_')}`;
      const unique = indexSpec.unique ? 'UNIQUE' : '';
      const columns = indexSpec.columns.join(', ');

      const createIndexSql = `CREATE ${unique} INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`;

      await this.execute(createIndexSql);

      this.logger.info('Index created', { tableName, indexName, columns });
    } catch (error) {
      this.logger.error('Failed to create index', error, { tableName, indexSpec });
      throw new ServiceError(
        'Failed to create PostgreSQL index',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { tableName, indexSpec, error: error.message },
        'postgresql-adapter'
      );
    }
  }
}