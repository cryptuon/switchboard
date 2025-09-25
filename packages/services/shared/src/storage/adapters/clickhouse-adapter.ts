/**
 * ChainSync ClickHouse Storage Adapter
 *
 * High-performance time-series storage for blockchain events and analytics
 */

import { createClient, ClickHouseClient } from '@clickhouse/client';
import { Logger } from '../../logging/logger';
import { ServiceError, ErrorCode } from '../../errors/service-errors';
import { MetricsCollector } from '../../metrics/metrics-collector';
import {
  TimeSeriesStorageAdapter,
  ConnectionConfig,
  QueryOptions,
  TimeSeriesQuery,
  BulkWriteOptions
} from '../interfaces/storage-adapter';

export class ClickHouseAdapter implements TimeSeriesStorageAdapter {
  private client?: ClickHouseClient;
  private isConnected = false;

  constructor(
    private config: ConnectionConfig,
    private logger: Logger,
    private metricsCollector?: MetricsCollector
  ) {}

  /**
   * Connect to ClickHouse
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient({
        host: `http://${this.config.host}:${this.config.port}`,
        database: this.config.database,
        username: this.config.username,
        password: this.config.password,
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 0
        }
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;

      this.logger.info('ClickHouse connected successfully', {
        host: this.config.host,
        database: this.config.database
      });

    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to connect to ClickHouse', error);
      throw new ServiceError(
        `ClickHouse connection failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Disconnect from ClickHouse
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.logger.info('ClickHouse disconnected');
    }
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('ClickHouse health check failed', error);
      return false;
    }
  }

  /**
   * Ping ClickHouse server
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('ClickHouse ping failed', error);
      return false;
    }
  }

  /**
   * Get ClickHouse statistics
   */
  async getStats(): Promise<any> {
    try {
      if (!this.client) {
        return null;
      }

      const result = await this.client.query({
        query: `
          SELECT
            sum(rows) as total_rows,
            sum(bytes_on_disk) as total_bytes,
            count() as table_count
          FROM system.parts
          WHERE database = {database:String}
        `,
        query_params: { database: this.config.database }
      });

      const stats = await result.json();
      return stats.data[0] || {};

    } catch (error) {
      this.logger.error('Failed to get ClickHouse stats', error);
      return null;
    }
  }

  /**
   * High-performance batch insert
   */
  async insert<T>(table: string, data: T[], options: BulkWriteOptions = {}): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      const batchSize = options.batchSize || 10000;

      // Process data in batches for optimal performance
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        await this.client.insert({
          table,
          values: batch,
          format: 'JSONEachRow'
        });
      }

      this.metricsCollector?.recordDatabaseOperation('insert', table, true, timer?.() || 0);

      this.logger.debug('ClickHouse batch insert completed', {
        table,
        recordCount: data.length,
        batches: Math.ceil(data.length / batchSize)
      });

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('insert', table, false, timer?.() || 0);

      this.logger.error('ClickHouse insert failed', error, {
        table,
        recordCount: data.length
      });

      throw new ServiceError(
        `ClickHouse insert failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { table, recordCount: data.length, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Streaming insert for continuous data
   */
  async insertStream<T>(table: string, dataStream: AsyncIterable<T>): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      let recordCount = 0;
      const batch: T[] = [];
      const batchSize = 5000;

      for await (const record of dataStream) {
        batch.push(record);
        recordCount++;

        if (batch.length >= batchSize) {
          await this.client.insert({
            table,
            values: batch,
            format: 'JSONEachRow'
          });
          batch.length = 0;
        }
      }

      // Insert remaining records
      if (batch.length > 0) {
        await this.client.insert({
          table,
          values: batch,
          format: 'JSONEachRow'
        });
      }

      this.metricsCollector?.recordDatabaseOperation('insertStream', table, true, timer?.() || 0);

      this.logger.debug('ClickHouse stream insert completed', {
        table,
        recordCount
      });

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('insertStream', table, false, timer?.() || 0);

      this.logger.error('ClickHouse stream insert failed', error, { table });

      throw new ServiceError(
        `ClickHouse stream insert failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { table, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Time-series optimized queries
   */
  async queryTimeSeries<T>(query: TimeSeriesQuery, table: string, options: QueryOptions = {}): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      // Build optimized time-series query
      const whereConditions = [
        `${query.timeField} >= {startTime:DateTime}`,
        `${query.timeField} <= {endTime:DateTime}`
      ];

      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          whereConditions.push(`${key} = {${key}:String}`);
        }
      }

      let sql = `
        SELECT ${query.metrics ? query.metrics.join(', ') : '*'}
        FROM ${table}
        WHERE ${whereConditions.join(' AND ')}
      `;

      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }

      sql += ` ORDER BY ${query.timeField} ASC`;

      const queryParams: any = {
        startTime: query.startTime.toISOString().replace('T', ' ').replace('Z', ''),
        endTime: query.endTime.toISOString().replace('T', ' ').replace('Z', '')
      };

      if (query.filters) {
        Object.assign(queryParams, query.filters);
      }

      const result = await this.client.query({
        query: sql,
        query_params: queryParams,
        format: 'JSONEachRow'
      });

      const data = await result.json<T>();

      this.metricsCollector?.recordDatabaseOperation('queryTimeSeries', table, true, timer?.() || 0);

      return Array.isArray(data) ? data : [data];

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('queryTimeSeries', table, false, timer?.() || 0);

      this.logger.error('ClickHouse time-series query failed', error, { table, query });

      throw new ServiceError(
        `ClickHouse time-series query failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { table, query, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Advanced aggregation queries
   */
  async aggregate<T>(table: string, query: {
    select: string[];
    where?: Record<string, any>;
    groupBy?: string[];
    orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    having?: Record<string, any>;
    limit?: number;
  }, options: QueryOptions = {}): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      let sql = `SELECT ${query.select.join(', ')} FROM ${table}`;
      const queryParams: any = {};

      if (query.where) {
        const whereConditions = Object.entries(query.where).map(([key, value], index) => {
          const paramName = `where_${key}_${index}`;
          queryParams[paramName] = value;
          return `${key} = {${paramName}:String}`;
        });
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }

      if (query.having) {
        const havingConditions = Object.entries(query.having).map(([key, value], index) => {
          const paramName = `having_${key}_${index}`;
          queryParams[paramName] = value;
          return `${key} = {${paramName}:String}`;
        });
        sql += ` HAVING ${havingConditions.join(' AND ')}`;
      }

      if (query.orderBy && query.orderBy.length > 0) {
        const orderBy = query.orderBy.map(({ field, direction }) => `${field} ${direction}`);
        sql += ` ORDER BY ${orderBy.join(', ')}`;
      }

      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }

      const result = await this.client.query({
        query: sql,
        query_params: queryParams,
        format: 'JSONEachRow'
      });

      const data = await result.json<T>();

      this.metricsCollector?.recordDatabaseOperation('aggregate', table, true, timer?.() || 0);

      return Array.isArray(data) ? data : [data];

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('aggregate', table, false, timer?.() || 0);

      this.logger.error('ClickHouse aggregation failed', error, { table, query });

      throw new ServiceError(
        `ClickHouse aggregation failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { table, query, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Time-based aggregations (optimized for analytics)
   */
  async aggregateByTime<T>(table: string, query: {
    timeField: string;
    interval: string;
    metrics: Array<{ field: string; function: 'count' | 'sum' | 'avg' | 'min' | 'max' }>;
    startTime: Date;
    endTime: Date;
    groupBy?: string[];
    filters?: Record<string, any>;
  }, options: QueryOptions = {}): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      // Build time-based aggregation query
      const timeWindow = `toStartOfInterval(${query.timeField}, INTERVAL ${query.interval}) as time_window`;
      const metrics = query.metrics.map(m => `${m.function}(${m.field}) as ${m.function}_${m.field}`);

      let selectClause = [timeWindow, ...metrics];
      if (query.groupBy) {
        selectClause.push(...query.groupBy);
      }

      const whereConditions = [
        `${query.timeField} >= {startTime:DateTime}`,
        `${query.timeField} <= {endTime:DateTime}`
      ];

      const queryParams: any = {
        startTime: query.startTime.toISOString().replace('T', ' ').replace('Z', ''),
        endTime: query.endTime.toISOString().replace('T', ' ').replace('Z', '')
      };

      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value], index) => {
          const paramName = `filter_${key}_${index}`;
          queryParams[paramName] = value;
          whereConditions.push(`${key} = {${paramName}:String}`);
        });
      }

      let groupByClause = ['time_window'];
      if (query.groupBy) {
        groupByClause.push(...query.groupBy);
      }

      const sql = `
        SELECT ${selectClause.join(', ')}
        FROM ${table}
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY ${groupByClause.join(', ')}
        ORDER BY time_window ASC
      `;

      const result = await this.client.query({
        query: sql,
        query_params: queryParams,
        format: 'JSONEachRow'
      });

      const data = await result.json<T>();

      this.metricsCollector?.recordDatabaseOperation('aggregateByTime', table, true, timer?.() || 0);

      return Array.isArray(data) ? data : [data];

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('aggregateByTime', table, false, timer?.() || 0);

      this.logger.error('ClickHouse time aggregation failed', error, { table, query });

      throw new ServiceError(
        `ClickHouse time aggregation failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { table, query, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Create materialized view for pre-computed analytics
   */
  async createMaterializedView(viewName: string, query: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      await this.client.command({
        query: `CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName} AS ${query}`
      });

      this.logger.info('ClickHouse materialized view created', { viewName });

    } catch (error) {
      this.logger.error('Failed to create materialized view', error, { viewName });
      throw new ServiceError(
        `Failed to create materialized view: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { viewName, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Refresh materialized view
   */
  async refreshMaterializedView(viewName: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      await this.client.command({
        query: `SYSTEM RELOAD MATERIALIZED VIEW ${viewName}`
      });

      this.logger.debug('ClickHouse materialized view refreshed', { viewName });

    } catch (error) {
      this.logger.error('Failed to refresh materialized view', error, { viewName });
      throw error;
    }
  }

  /**
   * Create optimized table for time-series data
   */
  async createTable(tableName: string, schema: {
    columns: Array<{ name: string; type: string; }>;
    engine?: string;
    partitionBy?: string[];
    orderBy?: string[];
    primaryKey?: string[];
  }): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      const columns = schema.columns.map(col => `${col.name} ${col.type}`).join(',\n  ');
      const engine = schema.engine || 'MergeTree()';

      let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns}\n) ENGINE = ${engine}`;

      if (schema.partitionBy && schema.partitionBy.length > 0) {
        sql += `\nPARTITION BY (${schema.partitionBy.join(', ')})`;
      }

      if (schema.orderBy && schema.orderBy.length > 0) {
        sql += `\nORDER BY (${schema.orderBy.join(', ')})`;
      }

      if (schema.primaryKey && schema.primaryKey.length > 0) {
        sql += `\nPRIMARY KEY (${schema.primaryKey.join(', ')})`;
      }

      await this.client.command({ query: sql });

      this.logger.info('ClickHouse table created', { tableName, schema });

    } catch (error) {
      this.logger.error('Failed to create ClickHouse table', error, { tableName });
      throw new ServiceError(
        `Failed to create table: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { tableName, originalError: error },
        'clickhouse-adapter'
      );
    }
  }

  /**
   * Drop partition for data retention management
   */
  async dropPartition(tableName: string, partition: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('ClickHouse client not initialized');
      }

      await this.client.command({
        query: `ALTER TABLE ${tableName} DROP PARTITION ${partition}`
      });

      this.logger.info('ClickHouse partition dropped', { tableName, partition });

    } catch (error) {
      this.logger.error('Failed to drop ClickHouse partition', error, { tableName, partition });
      throw error;
    }
  }
}