/**
 * ChainSync DuckDB Adapter
 *
 * Lightweight analytics storage adapter optimized for fast analytical queries
 */

import * as duckdb from 'duckdb';
import { Logger } from '../../logging/logger';
import { ServiceError, ErrorCode } from '../../errors/service-errors';
import { MetricsCollector } from '../../metrics/metrics-collector';
import {
  TimeSeriesStorageAdapter,
  ConnectionConfig,
  QueryOptions,
  BulkWriteOptions,
  TimeSeriesQuery
} from '../interfaces/storage-adapter';

export class DuckDBAdapter implements TimeSeriesStorageAdapter {
  private db?: duckdb.Database;
  private connection?: duckdb.Connection;
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
      // DuckDB can work with in-memory database (:memory:) or file-based
      const dbPath = this.config.database === ':memory:' ? ':memory:' : this.config.database;

      this.db = new duckdb.Database(dbPath);
      this.connection = this.db.connect();

      // Test connection with a simple query
      await this.executeQuery('SELECT 1 as test');

      // Enable some common extensions
      await this.executeQuery("INSTALL 'json'");
      await this.executeQuery("LOAD 'json'");

      this.logger.info('DuckDB connection established', {
        database: this.config.database,
        path: dbPath
      });
    } catch (error) {
      this.logger.error('Failed to connect to DuckDB', error);
      throw new ServiceError(
        'DuckDB connection failed',
        ErrorCode.DATABASE_CONNECTION_ERROR,
        500,
        { config: this.config },
        'duckdb-adapter'
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      this.connection = undefined;
    }
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
    this.logger.info('DuckDB connection closed');
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.connection) return false;
      await this.executeQuery('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('DuckDB health check failed', error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    return this.isHealthy();
  }

  async getStats(): Promise<any> {
    try {
      if (!this.connection) return null;

      const tables = await this.executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
      const dbSize = await this.executeQuery("SELECT pg_database_size(current_database()) as size");

      return {
        tableCount: tables.length,
        databaseSize: dbSize[0]?.size || 0,
        engine: 'DuckDB',
        version: await this.executeQuery("SELECT version()").then(r => r[0]?.version)
      };
    } catch (error) {
      this.logger.error('Error getting DuckDB stats', error);
      return null;
    }
  }

  private async executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        reject(new Error('DuckDB connection not initialized'));
        return;
      }

      this.connection.all(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result || []);
        }
      });
    });
  }

  async insert<T>(table: string, data: T[], options: BulkWriteOptions = {}): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection || data.length === 0) return;

      const batchSize = options.batchSize || 10000;

      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        // Convert batch to CSV-like format for efficient insertion
        const columns = Object.keys(batch[0] as any);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Use prepared statement for better performance
        await new Promise<void>((resolve, reject) => {
          if (!this.connection) {
            reject(new Error('Connection lost'));
            return;
          }

          const stmt = this.connection.prepare(insertSql);

          const insertBatch = async () => {
            try {
              for (const record of batch) {
                const values = columns.map(col => (record as any)[col]);
                await new Promise<void>((resolveRow, rejectRow) => {
                  stmt.run(values, (err) => {
                    if (err) rejectRow(err);
                    else resolveRow();
                  });
                });
              }
              stmt.finalize();
              resolve();
            } catch (error) {
              stmt.finalize();
              reject(error);
            }
          };

          insertBatch();
        });
      }

      this.metricsCollector?.recordDatabaseOperation(
        'insert',
        'duckdb',
        true,
        timer?.() || 0
      );

      this.logger.debug('DuckDB bulk insert completed', {
        table,
        recordCount: data.length,
        batches: Math.ceil(data.length / batchSize)
      });
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'insert',
        'duckdb',
        false,
        timer?.() || 0
      );

      this.logger.error('DuckDB insert failed', error, { table, recordCount: data.length });
      throw new ServiceError(
        'DuckDB insert failed',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { table, recordCount: data.length, error: error.message },
        'duckdb-adapter'
      );
    }
  }

  async insertStream<T>(table: string, dataStream: AsyncIterable<T>): Promise<void> {
    const timer = this.metricsCollector?.createTimer();
    let recordCount = 0;

    try {
      const batch: T[] = [];
      const batchSize = 5000;

      for await (const record of dataStream) {
        batch.push(record);
        recordCount++;

        if (batch.length >= batchSize) {
          await this.insert(table, batch);
          batch.length = 0;
        }
      }

      // Insert remaining records
      if (batch.length > 0) {
        await this.insert(table, batch);
      }

      this.metricsCollector?.recordDatabaseOperation(
        'insertStream',
        'duckdb',
        true,
        timer?.() || 0
      );

      this.logger.info('DuckDB stream insert completed', { table, recordCount });
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'insertStream',
        'duckdb',
        false,
        timer?.() || 0
      );

      this.logger.error('DuckDB stream insert failed', error, { table, recordCount });
      throw error;
    }
  }

  async queryTimeSeries<T>(table: string, query: TimeSeriesQuery, options: QueryOptions = {}): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      let sql = `SELECT `;

      // Build SELECT clause
      if (query.metrics && query.metrics.length > 0) {
        sql += query.metrics.join(', ');
      } else {
        sql += '*';
      }

      sql += ` FROM ${table}`;

      // Add WHERE clause for time range and filters
      const conditions: string[] = [];
      const params: any[] = [];

      conditions.push(`${query.timeField} >= ?`);
      params.push(query.startTime);

      conditions.push(`${query.timeField} <= ?`);
      params.push(query.endTime);

      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          conditions.push(`${key} = ?`);
          params.push(value);
        });
      }

      sql += ` WHERE ${conditions.join(' AND ')}`;

      // Add GROUP BY clause
      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }

      // Add ORDER BY clause (default by time field)
      sql += ` ORDER BY ${query.timeField}`;

      const result = await this.executeQuery(sql, params);

      this.metricsCollector?.recordDatabaseOperation(
        'queryTimeSeries',
        'duckdb',
        true,
        timer?.() || 0
      );

      return result as T[];
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'queryTimeSeries',
        'duckdb',
        false,
        timer?.() || 0
      );

      this.logger.error('DuckDB time-series query failed', error, { table, query });
      throw new ServiceError(
        'DuckDB time-series query failed',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { table, query, error: error.message },
        'duckdb-adapter'
      );
    }
  }

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
      let sql = `SELECT ${query.select.join(', ')} FROM ${table}`;
      const params: any[] = [];

      // WHERE clause
      if (query.where) {
        const conditions = Object.entries(query.where).map(([key, value]) => {
          params.push(value);
          return `${key} = ?`;
        });
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      // GROUP BY clause
      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }

      // HAVING clause
      if (query.having) {
        const havingConditions = Object.entries(query.having).map(([key, value]) => {
          params.push(value);
          return `${key} = ?`;
        });
        sql += ` HAVING ${havingConditions.join(' AND ')}`;
      }

      // ORDER BY clause
      if (query.orderBy && query.orderBy.length > 0) {
        const orderColumns = query.orderBy
          .map(({ field, direction }) => `${field} ${direction}`)
          .join(', ');
        sql += ` ORDER BY ${orderColumns}`;
      }

      // LIMIT clause
      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }

      const result = await this.executeQuery(sql, params);

      this.metricsCollector?.recordDatabaseOperation(
        'aggregate',
        'duckdb',
        true,
        timer?.() || 0
      );

      return result as T[];
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'aggregate',
        'duckdb',
        false,
        timer?.() || 0
      );

      this.logger.error('DuckDB aggregate query failed', error, { table, query });
      throw error;
    }
  }

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
      // Build time bucket function based on interval
      const timeFormat = this.getTimeFormatForInterval(query.interval);
      const timeBucket = `strftime('${timeFormat}', ${query.timeField}) as time_bucket`;

      // Build metric aggregations
      const metricSelects = query.metrics.map(metric =>
        `${metric.function.toUpperCase()}(${metric.field}) as ${metric.field}_${metric.function}`
      );

      let selectClause = [timeBucket, ...metricSelects];
      if (query.groupBy && query.groupBy.length > 0) {
        selectClause = selectClause.concat(query.groupBy);
      }

      let sql = `SELECT ${selectClause.join(', ')} FROM ${table}`;

      // WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];

      conditions.push(`${query.timeField} >= ?`);
      params.push(query.startTime);

      conditions.push(`${query.timeField} <= ?`);
      params.push(query.endTime);

      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          conditions.push(`${key} = ?`);
          params.push(value);
        });
      }

      sql += ` WHERE ${conditions.join(' AND ')}`;

      // GROUP BY clause
      let groupByFields = ['time_bucket'];
      if (query.groupBy && query.groupBy.length > 0) {
        groupByFields = groupByFields.concat(query.groupBy);
      }
      sql += ` GROUP BY ${groupByFields.join(', ')}`;

      // ORDER BY time
      sql += ` ORDER BY time_bucket`;

      const result = await this.executeQuery(sql, params);

      this.metricsCollector?.recordDatabaseOperation(
        'aggregateByTime',
        'duckdb',
        true,
        timer?.() || 0
      );

      return result as T[];
    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'aggregateByTime',
        'duckdb',
        false,
        timer?.() || 0
      );

      this.logger.error('DuckDB time-based aggregate failed', error, { table, query });
      throw error;
    }
  }

  private getTimeFormatForInterval(interval: string): string {
    switch (interval) {
      case '1s':
      case '1second':
        return '%Y-%m-%d %H:%M:%S';
      case '1m':
      case '1minute':
        return '%Y-%m-%d %H:%M:00';
      case '1h':
      case '1hour':
        return '%Y-%m-%d %H:00:00';
      case '1d':
      case '1day':
        return '%Y-%m-%d';
      case '1w':
      case '1week':
        return '%Y-W%W';
      case '1M':
      case '1month':
        return '%Y-%m';
      case '1y':
      case '1year':
        return '%Y';
      default:
        return '%Y-%m-%d %H:%M:00'; // Default to minute precision
    }
  }

  async createMaterializedView(viewName: string, query: string): Promise<void> {
    try {
      const createViewSql = `CREATE OR REPLACE VIEW ${viewName} AS ${query}`;
      await this.executeQuery(createViewSql);

      this.logger.info('Materialized view created', { viewName });
    } catch (error) {
      this.logger.error('Failed to create materialized view', error, { viewName, query });
      throw new ServiceError(
        'Failed to create DuckDB materialized view',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { viewName, query, error: error.message },
        'duckdb-adapter'
      );
    }
  }

  async refreshMaterializedView(viewName: string): Promise<void> {
    // DuckDB views are automatically refreshed, no explicit refresh needed
    this.logger.debug('DuckDB views are automatically refreshed', { viewName });
  }

  async createTable(tableName: string, schema: {
    columns: Array<{ name: string; type: string; }>;
    engine?: string;
    partitionBy?: string[];
    orderBy?: string[];
    primaryKey?: string[];
  }): Promise<void> {
    try {
      const columns = schema.columns
        .map(col => `${col.name} ${col.type}`)
        .join(', ');

      let createSql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns}`;

      if (schema.primaryKey && schema.primaryKey.length > 0) {
        createSql += `, PRIMARY KEY (${schema.primaryKey.join(', ')})`;
      }

      createSql += ')';

      await this.executeQuery(createSql);

      this.logger.info('Table created', { tableName, schema });
    } catch (error) {
      this.logger.error('Failed to create table', error, { tableName, schema });
      throw new ServiceError(
        'Failed to create DuckDB table',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { tableName, schema, error: error.message },
        'duckdb-adapter'
      );
    }
  }

  async dropPartition(tableName: string, partition: string): Promise<void> {
    try {
      // DuckDB doesn't have explicit partitioning like ClickHouse
      // This could be implemented as deletion based on time ranges
      const dropSql = `DELETE FROM ${tableName} WHERE ${partition}`;
      await this.executeQuery(dropSql);

      this.logger.info('Partition dropped (data deleted)', { tableName, partition });
    } catch (error) {
      this.logger.error('Failed to drop partition', error, { tableName, partition });
      throw new ServiceError(
        'Failed to drop DuckDB partition',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        { tableName, partition, error: error.message },
        'duckdb-adapter'
      );
    }
  }
}