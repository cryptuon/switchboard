/**
 * Switchboard Authentication Middleware
 *
 * Express middleware for JWT and API key authentication
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { JWTManager, JWTPayload, APIKey } from './jwt-manager';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { Logger } from '../logging/logger';
import { MetricsCollector } from '../metrics/metrics-collector';

export interface AuthRequest extends Request {
  user?: JWTPayload & {
    authType: 'jwt' | 'apikey';
    apiKeyId?: string;
  };
}

export interface AuthMiddlewareConfig {
  jwtManager: JWTManager;
  logger: Logger;
  metricsCollector?: MetricsCollector;
  getUserById?: (id: string) => Promise<any>;
  getAPIKeyById?: (id: string) => Promise<APIKey | null>;
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  };
}

export class AuthMiddleware {
  private readonly jwtManager: JWTManager;
  private readonly logger: Logger;
  private readonly metricsCollector?: MetricsCollector;
  private readonly getUserById?: (id: string) => Promise<any>;
  private readonly getAPIKeyById?: (id: string) => Promise<APIKey | null>;

  constructor(config: AuthMiddlewareConfig) {
    this.jwtManager = config.jwtManager;
    this.logger = config.logger;
    this.metricsCollector = config.metricsCollector;
    this.getUserById = config.getUserById;
    this.getAPIKeyById = config.getAPIKeyById;
  }

  /**
   * Create rate limiting middleware
   */
  createRateLimitMiddleware(config: {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
  }) {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.maxRequests,
      message: config.message || {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.windowMs / 1000)
      },
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      handler: (req: Request, res: Response) => {
        this.logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });

        this.metricsCollector?.recordHttpRequest(
          req.method,
          req.path,
          429,
          0
        );

        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Authentication middleware - supports both JWT and API keys
   */
  authenticate(options: {
    required?: boolean;
    permissions?: string[];
    allowApiKey?: boolean;
  } = {}) {
    const { required = true, permissions = [], allowApiKey = true } = options;

    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const timer = this.metricsCollector?.createTimer();

      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          if (!required) {
            return next();
          }
          throw new ServiceError(
            'Authorization header required',
            ErrorCode.AUTHENTICATION_ERROR,
            401,
            {},
            'auth-middleware'
          );
        }

        let user: JWTPayload & { authType: 'jwt' | 'apikey'; apiKeyId?: string };

        if (authHeader.startsWith('Bearer ')) {
          // JWT Token authentication
          const token = authHeader.slice(7);
          const payload = await this.jwtManager.validateToken(token);

          user = {
            ...payload,
            authType: 'jwt'
          };

          this.logger.debug('JWT authentication successful', {
            userId: payload.userId,
            role: payload.role
          });

        } else if (authHeader.startsWith('ApiKey ') && allowApiKey) {
          // API Key authentication
          const apiKey = authHeader.slice(7);

          if (!this.getAPIKeyById) {
            throw new ServiceError(
              'API key authentication not configured',
              ErrorCode.CONFIGURATION_ERROR,
              500,
              {},
              'auth-middleware'
            );
          }

          // Extract key ID from API key format: cs_keyId_hash
          const keyParts = apiKey.split('_');
          if (keyParts.length < 2 || keyParts[0] !== 'cs') {
            throw new ServiceError(
              'Invalid API key format',
              ErrorCode.AUTHENTICATION_ERROR,
              401,
              {},
              'auth-middleware'
            );
          }

          // For this implementation, we'll need to search by the full key
          // In production, you'd want a more efficient lookup mechanism
          const storedKey = await this.findAPIKeyByValue(apiKey);

          if (!storedKey || !(await this.jwtManager.validateAPIKey(apiKey, storedKey))) {
            throw new ServiceError(
              'Invalid or expired API key',
              ErrorCode.AUTHENTICATION_ERROR,
              401,
              {},
              'auth-middleware'
            );
          }

          // Get user data for the API key
          const userData = this.getUserById ? await this.getUserById(storedKey.userId) : null;

          user = {
            userId: storedKey.userId,
            email: userData?.email || '',
            role: userData?.role || 'user',
            permissions: storedKey.permissions,
            authType: 'apikey',
            apiKeyId: storedKey.id
          };

          this.logger.debug('API key authentication successful', {
            userId: storedKey.userId,
            keyId: storedKey.id,
            keyName: storedKey.name
          });

        } else {
          throw new ServiceError(
            'Invalid authorization format. Use "Bearer <token>" or "ApiKey <key>"',
            ErrorCode.AUTHENTICATION_ERROR,
            401,
            {},
            'auth-middleware'
          );
        }

        // Check permissions
        if (permissions.length > 0) {
          const hasPermission = permissions.some(permission =>
            user.permissions.includes(permission) ||
            user.permissions.includes('*') ||
            user.role === 'admin'
          );

          if (!hasPermission) {
            throw new ServiceError(
              'Insufficient permissions',
              ErrorCode.AUTHORIZATION_ERROR,
              403,
              {
                requiredPermissions: permissions,
                userPermissions: user.permissions
              },
              'auth-middleware'
            );
          }
        }

        // Attach user to request
        req.user = user;

        this.metricsCollector?.recordHttpRequest(
          req.method,
          req.path,
          200,
          timer?.() || 0
        );

        next();

      } catch (error) {
        this.logger.warn('Authentication failed', error, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });

        this.metricsCollector?.recordHttpRequest(
          req.method,
          req.path,
          error instanceof ServiceError ? error.statusCode : 500,
          timer?.() || 0
        );

        if (error instanceof ServiceError) {
          res.status(error.statusCode).json({
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTHENTICATION_ERROR',
            timestamp: new Date().toISOString()
          });
        }
      }
    };
  }

  /**
   * Role-based authorization middleware
   */
  requireRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        this.logger.warn('Role authorization failed', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });

        return res.status(403).json({
          error: 'Insufficient role permissions',
          code: 'ROLE_AUTHORIZATION_FAILED',
          required: allowedRoles,
          current: req.user.role
        });
      }

      next();
    };
  }

  /**
   * Permission-based authorization middleware
   */
  requirePermission(permissions: string | string[]) {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const hasPermission = requiredPermissions.some(permission =>
        req.user!.permissions.includes(permission) ||
        req.user!.permissions.includes('*') ||
        req.user!.role === 'admin'
      );

      if (!hasPermission) {
        this.logger.warn('Permission authorization failed', {
          userId: req.user.userId,
          userPermissions: req.user.permissions,
          requiredPermissions
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_AUTHORIZATION_FAILED',
          required: requiredPermissions,
          current: req.user.permissions
        });
      }

      next();
    };
  }

  /**
   * Helper method to find API key by value
   * In production, this should be optimized with proper indexing
   */
  private async findAPIKeyByValue(apiKey: string): Promise<APIKey | null> {
    // This is a simplified implementation
    // In production, you'd want to implement proper API key lookup
    // possibly by storing a hash of the key as an index

    if (!this.getAPIKeyById) {
      return null;
    }

    // For now, return null - this needs to be implemented based on your storage solution
    // You would typically store API keys with a searchable hash or prefix
    this.logger.warn('API key lookup not fully implemented - needs storage integration');
    return null;
  }
}