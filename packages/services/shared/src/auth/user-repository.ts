/**
 * Switchboard User Repository
 *
 * Database operations for users and API keys
 */

import { RepositoryBase } from '../database/repository-base';
import { DatabaseConnectionManager } from '../database/connection-manager';
import { Logger } from '../logging/logger';
import { MetricsCollector } from '../metrics/metrics-collector';
import { AuthUser, APIKey } from './jwt-manager';
import { ServiceError, ErrorCode } from '../errors/service-errors';

export interface IUserDocument extends AuthUser {
  _id: string;
}

export interface IAPIKeyDocument extends APIKey {
  _id: string;
}

export interface UserFilters {
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface APIKeyFilters {
  userId?: string;
  isActive?: boolean;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export class UserRepository extends RepositoryBase<IUserDocument> {
  private apiKeyModel: any;

  constructor(
    connectionManager: DatabaseConnectionManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    // Create User model schema
    const userSchema = {
      id: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin', 'service'], default: 'user' },
      permissions: [{ type: String }],
      isActive: { type: Boolean, default: true },
      lastLoginAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    };

    // Create APIKey model schema
    const apiKeySchema = {
      id: { type: String, required: true, unique: true },
      userId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      keyHash: { type: String, required: true },
      permissions: [{ type: String }],
      isActive: { type: Boolean, default: true },
      lastUsedAt: { type: Date },
      expiresAt: { type: Date },
      createdAt: { type: Date, default: Date.now }
    };

    super(connectionManager.getModel('User', userSchema), connectionManager, logger, metricsCollector);
    this.apiKeyModel = connectionManager.getModel('APIKey', apiKeySchema);
  }

  /**
   * Create a new user
   */
  async createUser(userData: Omit<AuthUser, 'createdAt' | 'updatedAt'>): Promise<IUserDocument> {
    const timer = this.metricsCollector?.createTimer();

    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ServiceError(
          'User with this email already exists',
          ErrorCode.VALIDATION_ERROR,
          409,
          { email: userData.email },
          'user-repository'
        );
      }

      const now = new Date();
      const user = await this.create({
        ...userData,
        _id: userData.id,
        createdAt: now,
        updatedAt: now
      } as IUserDocument);

      this.metricsCollector?.recordDatabaseOperation(
        'createUser',
        'User',
        true,
        timer?.() || 0
      );

      this.logger.info('User created', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return user;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'createUser',
        'User',
        false,
        timer?.() || 0
      );

      if (error instanceof ServiceError) {
        throw error;
      }

      this.logger.error('Failed to create user', error, { email: userData.email });
      throw new ServiceError(
        'Failed to create user',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUserDocument | null> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const user = await this.findOne({ email });

      this.metricsCollector?.recordDatabaseOperation(
        'findByEmail',
        'User',
        true,
        timer?.() || 0
      );

      return user;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'findByEmail',
        'User',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to find user by email', error, { email });
      throw new ServiceError(
        'Failed to find user',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUserDocument | null> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const user = await this.findOne({ id });

      this.metricsCollector?.recordDatabaseOperation(
        'findById',
        'User',
        true,
        timer?.() || 0
      );

      return user;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'findById',
        'User',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to find user by ID', error, { id });
      throw new ServiceError(
        'Failed to find user',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId: string): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      await this.updateOne(
        { id: userId },
        {
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      );

      this.metricsCollector?.recordDatabaseOperation(
        'updateLastLogin',
        'User',
        true,
        timer?.() || 0
      );

      this.logger.debug('User last login updated', { userId });

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'updateLastLogin',
        'User',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to update last login', error, { userId });
    }
  }

  /**
   * Create API key
   */
  async createAPIKey(keyData: APIKey): Promise<IAPIKeyDocument> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const apiKey = new this.apiKeyModel({
        ...keyData,
        _id: keyData.id
      });

      await apiKey.save();

      this.metricsCollector?.recordDatabaseOperation(
        'createAPIKey',
        'APIKey',
        true,
        timer?.() || 0
      );

      this.logger.info('API key created', {
        keyId: keyData.id,
        userId: keyData.userId,
        name: keyData.name
      });

      return apiKey;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'createAPIKey',
        'APIKey',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to create API key', error, {
        userId: keyData.userId,
        name: keyData.name
      });

      throw new ServiceError(
        'Failed to create API key',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Find API key by ID
   */
  async findAPIKeyById(id: string): Promise<IAPIKeyDocument | null> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const apiKey = await this.apiKeyModel.findOne({ id });

      this.metricsCollector?.recordDatabaseOperation(
        'findAPIKeyById',
        'APIKey',
        true,
        timer?.() || 0
      );

      return apiKey;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'findAPIKeyById',
        'APIKey',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to find API key', error, { id });
      throw new ServiceError(
        'Failed to find API key',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Find API keys by user ID
   */
  async findAPIKeysByUserId(userId: string, activeOnly: boolean = true): Promise<IAPIKeyDocument[]> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const query: any = { userId };
      if (activeOnly) {
        query.isActive = true;
        query.$or = [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ];
      }

      const apiKeys = await this.apiKeyModel.find(query).sort({ createdAt: -1 });

      this.metricsCollector?.recordDatabaseOperation(
        'findAPIKeysByUserId',
        'APIKey',
        true,
        timer?.() || 0
      );

      return apiKeys;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'findAPIKeysByUserId',
        'APIKey',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to find API keys for user', error, { userId });
      throw new ServiceError(
        'Failed to find API keys',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Update API key last used
   */
  async updateAPIKeyLastUsed(keyId: string): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      await this.apiKeyModel.updateOne(
        { id: keyId },
        { lastUsedAt: new Date() }
      );

      this.metricsCollector?.recordDatabaseOperation(
        'updateAPIKeyLastUsed',
        'APIKey',
        true,
        timer?.() || 0
      );

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'updateAPIKeyLastUsed',
        'APIKey',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to update API key last used', error, { keyId });
    }
  }

  /**
   * Deactivate API key
   */
  async deactivateAPIKey(keyId: string): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      await this.apiKeyModel.updateOne(
        { id: keyId },
        { isActive: false }
      );

      this.metricsCollector?.recordDatabaseOperation(
        'deactivateAPIKey',
        'APIKey',
        true,
        timer?.() || 0
      );

      this.logger.info('API key deactivated', { keyId });

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'deactivateAPIKey',
        'APIKey',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to deactivate API key', error, { keyId });
      throw new ServiceError(
        'Failed to deactivate API key',
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: error },
        'user-repository'
      );
    }
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredAPIKeys(): Promise<number> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const result = await this.apiKeyModel.deleteMany({
        isActive: false,
        expiresAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days ago
      });

      this.metricsCollector?.recordDatabaseOperation(
        'cleanupExpiredAPIKeys',
        'APIKey',
        true,
        timer?.() || 0
      );

      this.logger.info('Expired API keys cleaned up', {
        deletedCount: result.deletedCount
      });

      return result.deletedCount;

    } catch (error) {
      this.metricsCollector?.recordDatabaseOperation(
        'cleanupExpiredAPIKeys',
        'APIKey',
        false,
        timer?.() || 0
      );

      this.logger.error('Failed to cleanup expired API keys', error);
      return 0;
    }
  }
}