/**
 * Switchboard MongoDB Storage Adapter
 *
 * Document storage for transactional data with ACID properties
 */

import mongoose, { Connection, ClientSession } from 'mongoose';
import { Logger } from '../../logging/logger';
import { ServiceError, ErrorCode } from '../../errors/service-errors';
import { MetricsCollector } from '../../metrics/metrics-collector';
import {
  DocumentStorageAdapter,
  ConnectionConfig,
  QueryOptions,
  PaginationOptions,
  PaginatedResult,
  AggregationPipeline,
  BulkWriteOptions
} from '../interfaces/storage-adapter';

export class MongoDBAdapter implements DocumentStorageAdapter {
  private connection?: Connection;
  private activeSessions: Set<ClientSession> = new Set();

  constructor(
    private config: ConnectionConfig,
    private logger: Logger,
    private metricsCollector?: MetricsCollector
  ) {}

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    try {
      const connectionOptions = {
        maxPoolSize: this.config.maxConnections || 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        bufferMaxEntries: 0,
        bufferCommands: false
      };

      // Build connection string
      let connectionString;
      if (this.config.username && this.config.password) {
        connectionString = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
      } else {
        connectionString = `mongodb://${this.config.host}:${this.config.port}/${this.config.database}`;
      }

      this.connection = await mongoose.createConnection(connectionString, connectionOptions);
      this.setupEventHandlers();

      this.logger.info('MongoDB connected successfully', {
        host: this.config.host,
        database: this.config.database
      });

    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw new ServiceError(
        `MongoDB connection failed: ${String(error)}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'mongodb-adapter'
      );
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.closeActiveSessions();
      await this.connection.close();
      this.logger.info('MongoDB disconnected');
    }
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.connection || this.connection.readyState !== 1) {
        return false;
      }
      await this.connection.db.admin().ping();
      return true;
    } catch (error) {
      this.logger.error('MongoDB health check failed', error);
      return false;
    }
  }

  /**
   * Ping MongoDB server
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.connection) {
        return false;
      }
      await this.connection.db.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get MongoDB statistics
   */
  async getStats(): Promise<any> {
    try {
      if (!this.connection) {
        return null;
      }

      const stats = await this.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        activeSessions: this.activeSessions.size
      };

    } catch (error) {
      this.logger.error('Failed to get MongoDB stats', error);
      return null;
    }
  }

  /**
   * Find a single document
   */
  async findOne<T>(
    collection: string,
    filter: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.findOne(filter, { session: options.session });

      this.metricsCollector?.recordDatabaseOperation('findOne', collection, true, timer?.() || 0);
      return result as T;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('findOne', collection, false, timer?.() || 0);
      this.handleError(error, 'findOne', { collection, filter });
      return null;
    }
  }

  /**
   * Find multiple documents
   */
  async find<T>(
    collection: string,
    filter: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const cursor = coll.find(filter, { session: options.session });
      const results = await cursor.toArray();

      this.metricsCollector?.recordDatabaseOperation('find', collection, true, timer?.() || 0);
      return results as T[];

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('find', collection, false, timer?.() || 0);
      this.handleError(error, 'find', { collection, filter });
      return [];
    }
  }

  /**
   * Find documents with pagination
   */
  async findPaginated<T>(
    collection: string,
    filter: Record<string, any>,
    pagination: PaginationOptions,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const timer = this.metricsCollector?.createTimer();
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);

      // Count total documents
      const total = await coll.countDocuments(filter, { session: options.session });

      // Fetch documents
      let cursor = coll.find(filter, { session: options.session })
        .skip(skip)
        .limit(limit);

      if (pagination.sort) {
        cursor = cursor.sort(pagination.sort);
      }

      const data = await cursor.toArray();
      const pages = Math.ceil(total / limit);

      const result = {
        data: data as T[],
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };

      this.metricsCollector?.recordDatabaseOperation('findPaginated', collection, true, timer?.() || 0);
      return result;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('findPaginated', collection, false, timer?.() || 0);
      this.handleError(error, 'findPaginated', { collection, filter, pagination });
      return {
        data: [],
        pagination: { page, limit, total: 0, pages: 0, hasNext: false, hasPrev: false }
      };
    }
  }

  /**
   * Insert a single document
   */
  async insertOne<T>(collection: string, document: T, options: QueryOptions = {}): Promise<T> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.insertOne(document as any, { session: options.session });

      this.metricsCollector?.recordDatabaseOperation('insertOne', collection, true, timer?.() || 0);
      return { ...document, _id: result.insertedId } as T;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('insertOne', collection, false, timer?.() || 0);
      this.handleError(error, 'insertOne', { collection });
      throw error;
    }
  }

  /**
   * Insert multiple documents
   */
  async insertMany<T>(
    collection: string,
    documents: T[],
    options: BulkWriteOptions = {}
  ): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.insertMany(documents, {
        ordered: options.ordered !== false,
        session: options.session
      });

      this.metricsCollector?.recordDatabaseOperation('insertMany', collection, true, timer?.() || 0);

      // Return documents with inserted IDs
      return documents.map((doc, index) => ({
        ...doc,
        _id: result.insertedIds[index]
      })) as T[];

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('insertMany', collection, false, timer?.() || 0);
      this.handleError(error, 'insertMany', { collection, count: documents.length });
      throw error;
    }
  }

  /**
   * Update a single document
   */
  async updateOne<T>(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.findOneAndUpdate(
        filter,
        update,
        {
          returnDocument: 'after',
          session: options.session
        }
      );

      this.metricsCollector?.recordDatabaseOperation('updateOne', collection, true, timer?.() || 0);
      return result.value as T;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('updateOne', collection, false, timer?.() || 0);
      this.handleError(error, 'updateOne', { collection, filter });
      return null;
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.updateMany(filter, update, { session: options.session });

      this.metricsCollector?.recordDatabaseOperation('updateMany', collection, true, timer?.() || 0);
      return {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('updateMany', collection, false, timer?.() || 0);
      this.handleError(error, 'updateMany', { collection, filter });
      return { modifiedCount: 0, matchedCount: 0 };
    }
  }

  /**
   * Delete a single document
   */
  async deleteOne<T>(
    collection: string,
    filter: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.findOneAndDelete(filter, { session: options.session });

      this.metricsCollector?.recordDatabaseOperation('deleteOne', collection, true, timer?.() || 0);
      return result.value as T;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('deleteOne', collection, false, timer?.() || 0);
      this.handleError(error, 'deleteOne', { collection, filter });
      return null;
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    collection: string,
    filter: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<{ deletedCount: number }> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.deleteMany(filter, { session: options.session });

      this.metricsCollector?.recordDatabaseOperation('deleteMany', collection, true, timer?.() || 0);
      return { deletedCount: result.deletedCount };

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('deleteMany', collection, false, timer?.() || 0);
      this.handleError(error, 'deleteMany', { collection, filter });
      return { deletedCount: 0 };
    }
  }

  /**
   * Count documents
   */
  async count(collection: string, filter: Record<string, any> = {}, options: QueryOptions = {}): Promise<number> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const count = await coll.countDocuments(filter, { session: options.session });

      this.metricsCollector?.recordDatabaseOperation('count', collection, true, timer?.() || 0);
      return count;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('count', collection, false, timer?.() || 0);
      this.handleError(error, 'count', { collection, filter });
      return 0;
    }
  }

  /**
   * Check if document exists
   */
  async exists(collection: string, filter: Record<string, any>, options: QueryOptions = {}): Promise<boolean> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const doc = await coll.findOne(filter, { projection: { _id: 1 }, session: options.session });

      this.metricsCollector?.recordDatabaseOperation('exists', collection, true, timer?.() || 0);
      return !!doc;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('exists', collection, false, timer?.() || 0);
      this.handleError(error, 'exists', { collection, filter });
      return false;
    }
  }

  /**
   * Perform aggregation
   */
  async aggregate<T>(
    collection: string,
    pipeline: AggregationPipeline[],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const cursor = coll.aggregate(pipeline, { session: options.session });
      const results = await cursor.toArray();

      this.metricsCollector?.recordDatabaseOperation('aggregate', collection, true, timer?.() || 0);
      return results as T[];

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('aggregate', collection, false, timer?.() || 0);
      this.handleError(error, 'aggregate', { collection, pipeline });
      return [];
    }
  }

  /**
   * Bulk write operations
   */
  async bulkWrite(collection: string, operations: any[], options: BulkWriteOptions = {}): Promise<any> {
    const timer = this.metricsCollector?.createTimer();

    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      const result = await coll.bulkWrite(operations, {
        ordered: options.ordered !== false,
        session: options.session
      });

      this.metricsCollector?.recordDatabaseOperation('bulkWrite', collection, true, timer?.() || 0);
      return result;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation('bulkWrite', collection, false, timer?.() || 0);
      this.handleError(error, 'bulkWrite', { collection, operations: operations.length });
      throw error;
    }
  }

  /**
   * Execute operation within a transaction
   */
  async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    if (!this.connection) {
      throw new Error('MongoDB connection not established');
    }

    const session = await this.connection.startSession();
    this.activeSessions.add(session);

    try {
      const result = await session.withTransaction(async () => {
        return await operation(session);
      });

      return result;

    } finally {
      this.activeSessions.delete(session);
      await session.endSession();
    }
  }

  /**
   * Create indexes
   */
  async createIndexes(collection: string, indexes: any[]): Promise<void> {
    try {
      if (!this.connection) {
        throw new Error('MongoDB connection not established');
      }

      const coll = this.connection.collection(collection);
      await coll.createIndexes(indexes);

      this.logger.info('MongoDB indexes created', {
        collection,
        indexCount: indexes.length
      });

    } catch (error) {
      this.logger.error('Failed to create MongoDB indexes', error, { collection });
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('connected', () => {
      this.logger.debug('MongoDB connected');
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });

    this.connection.on('error', (error) => {
      this.logger.error('MongoDB connection error', error);
      this.metricsCollector?.recordError('mongodb_connection', 'connection');
    });
  }

  /**
   * Close active sessions
   */
  private async closeActiveSessions(): Promise<void> {
    if (this.activeSessions.size === 0) return;

    this.logger.debug('Closing active MongoDB sessions', {
      sessionCount: this.activeSessions.size
    });

    const closePromises = Array.from(this.activeSessions).map(async (session) => {
      try {
        await session.endSession();
      } catch (error) {
        this.logger.error('Error closing MongoDB session', error);
      }
    });

    await Promise.all(closePromises);
    this.activeSessions.clear();
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any, operation: string, context: any): void {
    this.logger.error(`MongoDB ${operation} failed`, error, context);

    if (!error.name?.includes('ServiceError')) {
      throw new ServiceError(
        `MongoDB ${operation} failed: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error, context },
        'mongodb-adapter'
      );
    }
    throw error;
  }
}