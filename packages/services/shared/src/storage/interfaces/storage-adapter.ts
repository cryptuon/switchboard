/**
 * ChainSync Storage Adapter Interfaces
 *
 * Abstract interfaces for different storage backends optimized for specific use cases
 */

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  [key: string]: any;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  session?: any;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AggregationPipeline {
  [key: string]: any;
}

export interface TimeSeriesQuery {
  timeField: string;
  startTime: Date;
  endTime: Date;
  groupBy?: string[];
  metrics?: string[];
  filters?: Record<string, any>;
}

export interface BulkWriteOptions {
  batchSize?: number;
  ordered?: boolean;
}

/**
 * Base storage adapter interface
 */
export interface StorageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  ping(): Promise<boolean>;
  getStats(): Promise<any>;
}

/**
 * Document storage interface (MongoDB, etc.)
 * Optimized for: Transactional data, complex documents, ACID operations
 */
export interface DocumentStorageAdapter extends StorageAdapter {
  // Basic CRUD operations
  findOne<T>(collection: string, filter: Record<string, any>, options?: QueryOptions): Promise<T | null>;
  find<T>(collection: string, filter: Record<string, any>, options?: QueryOptions): Promise<T[]>;
  findPaginated<T>(
    collection: string,
    filter: Record<string, any>,
    pagination: PaginationOptions,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>>;

  insertOne<T>(collection: string, document: T, options?: QueryOptions): Promise<T>;
  insertMany<T>(collection: string, documents: T[], options?: BulkWriteOptions): Promise<T[]>;

  updateOne<T>(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: QueryOptions
  ): Promise<T | null>;
  updateMany(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: QueryOptions
  ): Promise<{ modifiedCount: number; matchedCount: number }>;

  deleteOne<T>(collection: string, filter: Record<string, any>, options?: QueryOptions): Promise<T | null>;
  deleteMany(collection: string, filter: Record<string, any>, options?: QueryOptions): Promise<{ deletedCount: number }>;

  count(collection: string, filter?: Record<string, any>, options?: QueryOptions): Promise<number>;
  exists(collection: string, filter: Record<string, any>, options?: QueryOptions): Promise<boolean>;

  // Advanced operations
  aggregate<T>(collection: string, pipeline: AggregationPipeline[], options?: QueryOptions): Promise<T[]>;
  bulkWrite(collection: string, operations: any[], options?: BulkWriteOptions): Promise<any>;

  // Transaction support
  withTransaction<T>(operation: (session: any) => Promise<T>): Promise<T>;

  // Index management
  createIndexes(collection: string, indexes: any[]): Promise<void>;
}

/**
 * Relational storage interface (PostgreSQL, MySQL, etc.)
 * Optimized for: Complex relationships, strong consistency, SQL queries
 */
export interface RelationalStorageAdapter extends StorageAdapter {
  // Basic CRUD with SQL
  query<T>(sql: string, params?: any[], options?: QueryOptions): Promise<T[]>;
  queryOne<T>(sql: string, params?: any[], options?: QueryOptions): Promise<T | null>;
  execute(sql: string, params?: any[], options?: QueryOptions): Promise<{ affectedRows: number }>;

  // Paginated queries
  queryPaginated<T>(
    sql: string,
    params: any[],
    pagination: PaginationOptions,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>>;

  // Prepared statements
  prepare(sql: string): Promise<any>;

  // Transaction support
  withTransaction<T>(operation: (client: any) => Promise<T>): Promise<T>;

  // Schema management
  createTable(tableName: string, schema: any): Promise<void>;
  createIndex(tableName: string, indexSpec: any): Promise<void>;
}

/**
 * Time-series/Analytics storage interface (ClickHouse, InfluxDB, etc.)
 * Optimized for: High-volume inserts, time-series data, analytics queries
 */
export interface TimeSeriesStorageAdapter extends StorageAdapter {
  // High-performance inserts
  insert<T>(table: string, data: T[], options?: BulkWriteOptions): Promise<void>;
  insertStream<T>(table: string, dataStream: AsyncIterable<T>): Promise<void>;

  // Time-series queries
  queryTimeSeries<T>(table: string, query: TimeSeriesQuery, options?: QueryOptions): Promise<T[]>;

  // Aggregations optimized for analytics
  aggregate<T>(table: string, query: {
    select: string[];
    where?: Record<string, any>;
    groupBy?: string[];
    orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    having?: Record<string, any>;
    limit?: number;
  }, options?: QueryOptions): Promise<T[]>;

  // Time-based aggregations
  aggregateByTime<T>(table: string, query: {
    timeField: string;
    interval: string; // '1m', '1h', '1d', etc.
    metrics: Array<{ field: string; function: 'count' | 'sum' | 'avg' | 'min' | 'max' }>;
    startTime: Date;
    endTime: Date;
    groupBy?: string[];
    filters?: Record<string, any>;
  }, options?: QueryOptions): Promise<T[]>;

  // Materialized views for pre-computed analytics
  createMaterializedView(viewName: string, query: string): Promise<void>;
  refreshMaterializedView(viewName: string): Promise<void>;

  // Table management for time-series data
  createTable(tableName: string, schema: {
    columns: Array<{ name: string; type: string; }>;
    engine?: string;
    partitionBy?: string[];
    orderBy?: string[];
    primaryKey?: string[];
  }): Promise<void>;

  // Data retention management
  dropPartition(tableName: string, partition: string): Promise<void>;
}

/**
 * Cache storage interface (Redis, etc.)
 * Optimized for: Fast access, session storage, temporary data
 */
export interface CacheStorageAdapter extends StorageAdapter {
  // Basic operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;

  // Hash operations
  hget<T>(key: string, field: string): Promise<T | null>;
  hset<T>(key: string, field: string, value: T): Promise<void>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  hdel(key: string, fields: string[]): Promise<number>;

  // List operations
  lpush<T>(key: string, values: T[]): Promise<number>;
  rpush<T>(key: string, values: T[]): Promise<number>;
  lpop<T>(key: string): Promise<T | null>;
  rpop<T>(key: string): Promise<T | null>;
  lrange<T>(key: string, start: number, end: number): Promise<T[]>;

  // Set operations
  sadd<T>(key: string, members: T[]): Promise<number>;
  smembers<T>(key: string): Promise<T[]>;
  sismember<T>(key: string, member: T): Promise<boolean>;

  // Pub/Sub
  publish(channel: string, message: any): Promise<number>;
  subscribe(channel: string, callback: (message: any) => void): Promise<void>;

  // Expiration
  expire(key: string, seconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;

  // Patterns
  keys(pattern: string): Promise<string[]>;
  scan(cursor: number, pattern?: string, count?: number): Promise<{ cursor: number; keys: string[] }>;
}

/**
 * Storage adapter factory interface
 */
export interface StorageAdapterFactory {
  createDocumentAdapter(config: ConnectionConfig): DocumentStorageAdapter;
  createRelationalAdapter(config: ConnectionConfig): RelationalStorageAdapter;
  createTimeSeriesAdapter(config: ConnectionConfig): TimeSeriesStorageAdapter;
  createCacheAdapter(config: ConnectionConfig): CacheStorageAdapter;
}

/**
 * Storage health check interface
 */
export interface StorageHealthCheck {
  checkDocumentStorage(): Promise<boolean>;
  checkRelationalStorage(): Promise<boolean>;
  checkTimeSeriesStorage(): Promise<boolean>;
  checkCacheStorage(): Promise<boolean>;
  getStorageStats(): Promise<{
    document?: any;
    relational?: any;
    timeSeries?: any;
    cache?: any;
  }>;
}