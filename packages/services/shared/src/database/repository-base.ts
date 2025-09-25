/**
 * ChainSync Repository Base Class
 *
 * Provides common database operations with proper error handling and metrics
 */

import { Document, Model, FilterQuery, UpdateQuery, QueryOptions, PopulateOptions, ClientSession } from 'mongoose';
import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { DatabaseConnectionManager } from './connection-manager';
import { MetricsCollector } from '../metrics/metrics-collector';

export interface RepositoryOptions {
  timeout?: number;
  retries?: number;
  session?: ClientSession;
  populateOptions?: PopulateOptions[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: any;
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

export abstract class RepositoryBase<T extends Document> {
  protected readonly model: Model<T>;
  protected readonly logger: Logger;
  protected readonly connectionManager: DatabaseConnectionManager;
  protected readonly metricsCollector?: MetricsCollector;
  protected readonly modelName: string;

  constructor(
    model: Model<T>,
    connectionManager: DatabaseConnectionManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    this.model = model;
    this.connectionManager = connectionManager;
    this.logger = logger;
    this.metricsCollector = metricsCollector;
    this.modelName = model.modelName;
  }

  /**
   * Find a document by ID
   */
  async findById(
    id: string,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeQuery(
      async () => {
        let query = this.model.findById(id, null, { session: options.session });

        if (options.populateOptions) {
          for (const populate of options.populateOptions) {
            query = query.populate(populate);
          }
        }

        return query.exec();
      },
      'findById',
      options
    );
  }

  /**
   * Find a single document by filter
   */
  async findOne(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeQuery(
      async () => {
        let query = this.model.findOne(filter, null, { session: options.session });

        if (options.populateOptions) {
          for (const populate of options.populateOptions) {
            query = query.populate(populate);
          }
        }

        return query.exec();
      },
      'findOne',
      options
    );
  }

  /**
   * Find multiple documents by filter
   */
  async find(
    filter: FilterQuery<T> = {},
    options: RepositoryOptions = {}
  ): Promise<T[]> {
    return this.executeQuery(
      async () => {
        let query = this.model.find(filter, null, { session: options.session });

        if (options.populateOptions) {
          for (const populate of options.populateOptions) {
            query = query.populate(populate);
          }
        }

        return query.exec();
      },
      'find',
      options
    );
  }

  /**
   * Find documents with pagination
   */
  async findPaginated(
    filter: FilterQuery<T> = {},
    paginationOptions: PaginationOptions = {},
    repositoryOptions: RepositoryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const page = Math.max(1, paginationOptions.page || 1);
    const limit = Math.min(100, Math.max(1, paginationOptions.limit || 20));
    const skip = (page - 1) * limit;

    return this.executeQuery(
      async () => {
        // Count total documents
        const total = await this.model.countDocuments(filter, { session: repositoryOptions.session });

        // Fetch documents
        let query = this.model
          .find(filter, null, { session: repositoryOptions.session })
          .skip(skip)
          .limit(limit);

        if (paginationOptions.sort) {
          query = query.sort(paginationOptions.sort);
        }

        if (repositoryOptions.populateOptions) {
          for (const populate of repositoryOptions.populateOptions) {
            query = query.populate(populate);
          }
        }

        const data = await query.exec();
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
      },
      'findPaginated',
      repositoryOptions
    );
  }

  /**
   * Create a new document
   */
  async create(
    data: Partial<T>,
    options: RepositoryOptions = {}
  ): Promise<T> {
    return this.executeQuery(
      async () => {
        const document = new this.model(data);
        return document.save({ session: options.session });
      },
      'create',
      options
    );
  }

  /**
   * Create multiple documents
   */
  async createMany(
    data: Partial<T>[],
    options: RepositoryOptions = {}
  ): Promise<T[]> {
    return this.executeQuery(
      async () => {
        return this.model.create(data, { session: options.session });
      },
      'createMany',
      options
    );
  }

  /**
   * Update a document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeQuery(
      async () => {
        return this.model.findByIdAndUpdate(
          id,
          update,
          {
            new: true,
            runValidators: true,
            session: options.session
          }
        ).exec();
      },
      'updateById',
      options
    );
  }

  /**
   * Update a single document by filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeQuery(
      async () => {
        return this.model.findOneAndUpdate(
          filter,
          update,
          {
            new: true,
            runValidators: true,
            session: options.session
          }
        ).exec();
      },
      'updateOne',
      options
    );
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<{ acknowledged: boolean; modifiedCount: number; matchedCount: number }> {
    return this.executeQuery(
      async () => {
        return this.model.updateMany(
          filter,
          update,
          {
            runValidators: true,
            session: options.session
          }
        ).exec();
      },
      'updateMany',
      options
    );
  }

  /**
   * Delete a document by ID
   */
  async deleteById(
    id: string,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeQuery(
      async () => {
        return this.model.findByIdAndDelete(id, { session: options.session }).exec();
      },
      'deleteById',
      options
    );
  }

  /**
   * Delete a single document by filter
   */
  async deleteOne(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    return this.executeQuery(
      async () => {
        return this.model.findOneAndDelete(filter, { session: options.session }).exec();
      },
      'deleteOne',
      options
    );
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.executeQuery(
      async () => {
        return this.model.deleteMany(filter, { session: options.session }).exec();
      },
      'deleteMany',
      options
    );
  }

  /**
   * Count documents
   */
  async count(
    filter: FilterQuery<T> = {},
    options: RepositoryOptions = {}
  ): Promise<number> {
    return this.executeQuery(
      async () => {
        return this.model.countDocuments(filter, { session: options.session }).exec();
      },
      'count',
      options
    );
  }

  /**
   * Check if document exists
   */
  async exists(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<boolean> {
    return this.executeQuery(
      async () => {
        const result = await this.model.exists(filter, { session: options.session });
        return !!result;
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
    return this.executeQuery(
      async () => {
        return this.model.aggregate(pipeline, { session: options.session }).exec();
      },
      'aggregate',
      options
    );
  }

  /**
   * Execute a custom operation within the repository context
   */
  async executeCustom<R>(
    operation: (model: Model<T>) => Promise<R>,
    operationName: string,
    options: RepositoryOptions = {}
  ): Promise<R> {
    return this.executeQuery(
      () => operation(this.model),
      `custom:${operationName}`,
      options
    );
  }

  /**
   * Execute bulk operations
   */
  async bulkWrite(
    operations: any[],
    options: RepositoryOptions = {}
  ): Promise<any> {
    return this.executeQuery(
      async () => {
        return this.model.bulkWrite(operations, { session: options.session });
      },
      'bulkWrite',
      options
    );
  }

  /**
   * Create indexes for better query performance
   */
  async createIndexes(indexes: any[]): Promise<void> {
    try {
      await this.model.createIndexes(indexes);
      this.logger.info('Database indexes created', {
        model: this.modelName,
        indexCount: indexes.length
      });
    } catch (error) {
      this.logger.error('Failed to create indexes', error, {
        model: this.modelName,
        indexes
      });
      throw error;
    }
  }

  /**
   * Execute query with proper error handling and metrics
   */
  protected async executeQuery<R>(
    operation: () => Promise<R>,
    operationName: string,
    options: RepositoryOptions = {}
  ): Promise<R> {
    const fullOperationName = `${this.modelName}:${operationName}`;

    return this.connectionManager.executeQuery(
      operation,
      fullOperationName,
      {
        timeout: options.timeout,
        retries: options.retries,
        session: options.session
      }
    );
  }

  /**
   * Start a transaction and return session
   */
  async startTransaction(): Promise<ClientSession> {
    return this.connectionManager.createSession();
  }

  /**
   * Execute operation within a transaction
   */
  async withTransaction<R>(
    operation: (session: ClientSession) => Promise<R>
  ): Promise<R> {
    return this.connectionManager.withTransaction(operation);
  }

  /**
   * Get repository statistics
   */
  async getStats() {
    try {
      const stats = await this.model.collection.stats();
      return {
        model: this.modelName,
        count: stats.count || 0,
        size: stats.size || 0,
        avgObjSize: stats.avgObjSize || 0,
        storageSize: stats.storageSize || 0,
        indexes: stats.nindexes || 0,
        indexSize: stats.totalIndexSize || 0
      };
    } catch (error) {
      this.logger.error('Failed to get repository stats', error, {
        model: this.modelName
      });
      return {
        model: this.modelName,
        count: 0,
        size: 0,
        avgObjSize: 0,
        storageSize: 0,
        indexes: 0,
        indexSize: 0
      };
    }
  }
}