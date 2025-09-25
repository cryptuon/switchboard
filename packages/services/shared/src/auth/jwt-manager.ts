/**
 * ChainSync JWT Authentication Manager
 *
 * Provides JWT token generation, validation, and management
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { Logger } from '../logging/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'service';
  apiKeyId?: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'service';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface JWTManagerConfig {
  secretKey: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  saltRounds: number;
}

export class JWTManager {
  private readonly config: JWTManagerConfig;
  private readonly logger: Logger;

  constructor(config: JWTManagerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    if (!config.secretKey || config.secretKey.length < 32) {
      throw new ServiceError(
        'JWT secret key must be at least 32 characters long',
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { keyLength: config.secretKey?.length || 0 },
        'jwt-manager'
      );
    }
  }

  /**
   * Generate JWT token for user
   */
  async generateToken(user: AuthUser): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      };

      const accessToken = jwt.sign(payload, this.config.secretKey, {
        expiresIn: this.config.expiresIn,
        issuer: this.config.issuer,
        subject: user.id
      });

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        this.config.secretKey,
        {
          expiresIn: this.config.refreshExpiresIn,
          issuer: this.config.issuer,
          subject: user.id
        }
      );

      this.logger.info('JWT tokens generated', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return { accessToken, refreshToken };

    } catch (error) {
      this.logger.error('Failed to generate JWT token', error, { userId: user.id });
      throw new ServiceError(
        'Failed to generate authentication token',
        ErrorCode.INTERNAL_ERROR,
        500,
        { originalError: error },
        'jwt-manager'
      );
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.config.secretKey, {
        issuer: this.config.issuer
      }) as JWTPayload;

      this.logger.debug('JWT token validated', {
        userId: decoded.userId,
        role: decoded.role
      });

      return decoded;

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ServiceError(
          'Authentication token has expired',
          ErrorCode.AUTHENTICATION_ERROR,
          401,
          { expiredAt: error.expiredAt },
          'jwt-manager'
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new ServiceError(
          'Invalid authentication token',
          ErrorCode.AUTHENTICATION_ERROR,
          401,
          { originalError: error.message },
          'jwt-manager'
        );
      }

      this.logger.error('JWT validation failed', error);
      throw new ServiceError(
        'Token validation failed',
        ErrorCode.AUTHENTICATION_ERROR,
        401,
        { originalError: error },
        'jwt-manager'
      );
    }
  }

  /**
   * Generate API key
   */
  async generateAPIKey(userId: string, name: string, permissions: string[]): Promise<{ apiKey: string; keyData: APIKey }> {
    try {
      const apiKey = `cs_${Buffer.from(`${userId}_${Date.now()}_${Math.random()}`).toString('base64').slice(0, 32)}`;
      const keyHash = await bcrypt.hash(apiKey, this.config.saltRounds);

      const keyData: APIKey = {
        id: `key_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId,
        name,
        keyHash,
        permissions,
        isActive: true,
        createdAt: new Date()
      };

      this.logger.info('API key generated', {
        userId,
        keyId: keyData.id,
        name,
        permissions: permissions.length
      });

      return { apiKey, keyData };

    } catch (error) {
      this.logger.error('Failed to generate API key', error, { userId, name });
      throw new ServiceError(
        'Failed to generate API key',
        ErrorCode.INTERNAL_ERROR,
        500,
        { originalError: error },
        'jwt-manager'
      );
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey: string, storedKeyData: APIKey): Promise<boolean> {
    try {
      if (!storedKeyData.isActive) {
        return false;
      }

      if (storedKeyData.expiresAt && storedKeyData.expiresAt < new Date()) {
        return false;
      }

      const isValid = await bcrypt.compare(apiKey, storedKeyData.keyHash);

      this.logger.debug('API key validation', {
        keyId: storedKeyData.id,
        isValid,
        userId: storedKeyData.userId
      });

      return isValid;

    } catch (error) {
      this.logger.error('API key validation failed', error, {
        keyId: storedKeyData.id
      });
      return false;
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.config.saltRounds);
    } catch (error) {
      this.logger.error('Password hashing failed', error);
      throw new ServiceError(
        'Failed to hash password',
        ErrorCode.INTERNAL_ERROR,
        500,
        { originalError: error },
        'jwt-manager'
      );
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      this.logger.error('Password verification failed', error);
      return false;
    }
  }

  /**
   * Generate password reset token
   */
  async generateResetToken(userId: string): Promise<string> {
    try {
      return jwt.sign(
        { userId, type: 'password_reset' },
        this.config.secretKey,
        {
          expiresIn: '1h',
          issuer: this.config.issuer,
          subject: userId
        }
      );
    } catch (error) {
      this.logger.error('Failed to generate reset token', error, { userId });
      throw new ServiceError(
        'Failed to generate password reset token',
        ErrorCode.INTERNAL_ERROR,
        500,
        { originalError: error },
        'jwt-manager'
      );
    }
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, this.config.secretKey, {
        issuer: this.config.issuer
      }) as { userId: string; type: string };

      if (decoded.type !== 'password_reset') {
        throw new ServiceError(
          'Invalid reset token type',
          ErrorCode.AUTHENTICATION_ERROR,
          401,
          {},
          'jwt-manager'
        );
      }

      return decoded.userId;

    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        'Invalid or expired reset token',
        ErrorCode.AUTHENTICATION_ERROR,
        401,
        { originalError: error },
        'jwt-manager'
      );
    }
  }
}