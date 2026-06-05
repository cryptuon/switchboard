/**
 * Switchboard Base Repository
 *
 * Abstract repository that routes operations to appropriate storage backends
 */

import { Logger } from '../../logging/logger';
import { ServiceError, ErrorCode } from '../../errors/service-errors';
import { MetricsCollector } from '../../metrics/metrics-collector';
import { StorageManager } from '../storage-manager';
import {
  DocumentStorageAdapter,
  RelationalStorageAdapter,
  TimeSeriesStorageAdapter,
  CacheStorageAdapter,
  QueryOptions,
  PaginationOptions,
  PaginatedResult
} from '../interfaces/storage-adapter';

export interface RepositoryOptions extends QueryOptions {
  populateFields?: string[];
  selectFields?: string[];
}

export abstract class BaseRepository<T> {
  protected readonly storageManager: StorageManager;
  protected readonly logger: Logger;
  protected readonly metricsCollector?: MetricsCollector;
  protected readonly entityName: string;

  constructor(
    entityName: string,
    storageManager: StorageManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    this.entityName = entityName;
    this.storageManager = storageManager;
    this.logger = logger;
    this.metricsCollector = metricsCollector;
  }

  /**
   * Get the appropriate storage adapter for this entity
   */
  protected getStorage(): DocumentStorageAdapter | RelationalStorageAdapter | TimeSeriesStorageAdapter | CacheStorageAdapter {
    return this.storageManager.getStorageForDataType(this.entityName as any);
  }

  /**
   * Get document storage (for transactional data)
   */
  protected getDocumentStorage(): DocumentStorageAdapter {
    const storage = this.getStorage();
    if (!this.isDocumentStorage(storage)) {
      throw new ServiceError(
        `Entity ${this.entityName} is not configured for document storage`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { entityName: this.entityName },
        'base-repository'
      );
    }
    return storage;
  }

  /**
   * Get relational storage (for analytical data)
   */
  protected getRelationalStorage(): RelationalStorageAdapter {
    const storage = this.getStorage();
    if (!this.isRelationalStorage(storage)) {
      throw new ServiceError(
        `Entity ${this.entityName} is not configured for relational storage`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { entityName: this.entityName },
        'base-repository'
      );
    }
    return storage;
  }

  /**
   * Get time-series storage (for event data)
   */
  protected getTimeSeriesStorage(): TimeSeriesStorageAdapter {
    const storage = this.getStorage();
    if (!this.isTimeSeriesStorage(storage)) {
      throw new ServiceError(
        `Entity ${this.entityName} is not configured for time-series storage`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { entityName: this.entityName },
        'base-repository'
      );
    }
    return storage;
  }

  /**
   * Get cache storage (for temporary data)
   */
  protected getCacheStorage(): CacheStorageAdapter {
    const storage = this.getStorage();
    if (!this.isCacheStorage(storage)) {
      throw new ServiceError(
        `Entity ${this.entityName} is not configured for cache storage`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { entityName: this.entityName },
        'base-repository'
      );
    }
    return storage;
  }

  /**
   * Execute operation with proper error handling and metrics
   */
  protected async executeOperation<R>(
    operation: () => Promise<R>,
    operationName: string,
    options: RepositoryOptions = {}
  ): Promise<R> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const result = await operation();

      this.metricsCollector?.recordDatabaseOperation(
        operationName,
        this.entityName,
        true,
        timer?.() || 0
      );

      return result;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        operationName,
        this.entityName,
        false,
        timer?.() || 0
      );

      this.logger.error(`Repository operation failed`, error, {
        entity: this.entityName,
        operation: operationName
      });

      throw error;
    }
  }

  /**
   * Transform data for storage
   */
  protected transformForStorage(data: Partial<T>): any {
    // Override in subclasses for data transformation
    return data;
  }

  /**
   * Transform data from storage
   */
  protected transformFromStorage(data: any): T {
    // Override in subclasses for data transformation
    return data as T;
  }

  /**
   * Transform list data from storage
   */
  protected transformListFromStorage(data: any[]): T[] {
    return data.map(item => this.transformFromStorage(item));
  }

  /**
   * Build cache key
   */
  protected buildCacheKey(operation: string, params: any): string {
    const paramsHash = JSON.stringify(params);
    return `${this.entityName}:${operation}:${Buffer.from(paramsHash).toString('base64')}`;
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

  /**
   * Common CRUD operations for document-based entities
   */

  /**
   * Find entity by ID
   */
  async findById(id: string, options: RepositoryOptions = {}): Promise<T | null> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const result = await storage.findOne(this.entityName, { _id: id }, options);
        return result ? this.transformFromStorage(result) : null;
      },
      'findById',
      options
    );
  }

  /**
   * Find entities by filter
   */
  async find(filter: Record<string, any> = {}, options: RepositoryOptions = {}): Promise<T[]> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const results = await storage.find(this.entityName, filter, options);
        return this.transformListFromStorage(results);
      },
      'find',
      options
    );
  }

  /**
   * Find entities with pagination
   */
  async findPaginated(
    filter: Record<string, any> = {},
    pagination: PaginationOptions = {},
    options: RepositoryOptions = {}
  ): Promise<PaginatedResult<T>> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const result = await storage.findPaginated(this.entityName, filter, pagination, options);
        return {
          ...result,
          data: this.transformListFromStorage(result.data)
        };
      },
      'findPaginated',
      options
    );
  }

  /**
   * Create new entity
   */
  async create(data: Partial<T>, options: RepositoryOptions = {}): Promise<T> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const transformedData = this.transformForStorage(data);
        const result = await storage.insertOne(this.entityName, transformedData, options);
        return this.transformFromStorage(result);
      },
      'create',
      options
    );
  }

  /**
   * Create multiple entities
   */
  async createMany(data: Partial<T>[], options: RepositoryOptions = {}): Promise<T[]> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const transformedData = data.map(item => this.transformForStorage(item));
        const results = await storage.insertMany(this.entityName, transformedData, options);
        return this.transformListFromStorage(results);
      },
      'createMany',
      options
    );
  }

  /**
   * Update entity by ID
   */
  async updateById(
    id: string,
    update: Partial<T>,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const transformedUpdate = this.transformForStorage(update);
        const result = await storage.updateOne(
          this.entityName,
          { _id: id },
          { $set: transformedUpdate },
          options
        );
        return result ? this.transformFromStorage(result) : null;
      },
      'updateById',
      options
    );
  }

  /**
   * Update entities by filter
   */
  async updateMany(
    filter: Record<string, any>,
    update: Partial<T>,
    options: RepositoryOptions = {}
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const transformedUpdate = this.transformForStorage(update);
        return await storage.updateMany(
          this.entityName,
          filter,
          { $set: transformedUpdate },
          options
        );
      },
      'updateMany',
      options
    );
  }

  /**
   * Delete entity by ID
   */
  async deleteById(id: string, options: RepositoryOptions = {}): Promise<T | null> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        const result = await storage.deleteOne(this.entityName, { _id: id }, options);
        return result ? this.transformFromStorage(result) : null;
      },
      'deleteById',
      options
    );
  }

  /**
   * Delete entities by filter
   */
  async deleteMany(
    filter: Record<string, any>,
    options: RepositoryOptions = {}
  ): Promise<{ deletedCount: number }> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        return await storage.deleteMany(this.entityName, filter, options);
      },
      'deleteMany',
      options
    );
  }

  /**
   * Count entities
   */
  async count(filter: Record<string, any> = {}, options: RepositoryOptions = {}): Promise<number> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        return await storage.count(this.entityName, filter, options);
      },
      'count',
      options
    );
  }

  /**
   * Check if entity exists
   */
  async exists(filter: Record<string, any>, options: RepositoryOptions = {}): Promise<boolean> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        return await storage.exists(this.entityName, filter, options);
      },
      'exists',
      options
    );
  }

  /**
   * Perform aggregation
   */
  async aggregate<R = any>(
    pipeline: any[],
    options: RepositoryOptions = {}
  ): Promise<R[]> {
    return this.executeOperation(
      async () => {
        const storage = this.getDocumentStorage();
        return await storage.aggregate(this.entityName, pipeline, options);
      },
      'aggregate',
      options
    );
  }

  /**
   * Execute within transaction
   */
  async withTransaction<R>(
    operation: (session: any) => Promise<R>
  ): Promise<R> {
    const storage = this.getDocumentStorage();
    return await storage.withTransaction(operation);
  }

  /**
   * Cache operations
   */

  /**
   * Get from cache
   */
  protected async getFromCache<R>(key: string): Promise<R | null> {
    try {
      const storage = this.getCacheStorage();
      return await storage.get<R>(key);
    } catch (error) {
      this.logger.warn('Cache get failed', error, { key });
      return null;
    }
  }

  /**
   * Set to cache
   */
  protected async setToCache<R>(key: string, value: R, ttl?: number): Promise<void> {
    try {
      const storage = this.getCacheStorage();
      await storage.set(key, value, ttl);
    } catch (error) {
      this.logger.warn('Cache set failed', error, { key });
    }
  }

  /**
   * Delete from cache
   */
  protected async deleteFromCache(key: string): Promise<void> {
    try {
      const storage = this.getCacheStorage();
      await storage.del(key);
    } catch (error) {
      this.logger.warn('Cache delete failed', error, { key });
    }
  }

  /**
   * Find with cache
   */
  protected async findWithCache<R>(
    cacheKey: string,
    operation: () => Promise<R>,
    ttl: number = 300 // 5 minutes default
  ): Promise<R> {
    // Try cache first
    const cached = await this.getFromCache<R>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute operation and cache result
    const result = await operation();
    await this.setToCache(cacheKey, result, ttl);
    return result;
  }
}