/**
 * ChainSync Configuration Manager
 *
 * Provides centralized configuration management with validation
 */

import Joi from 'joi';
import { Logger, createLogger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';

export interface DatabaseConfig {
  url: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface RedisConfig {
  url: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetries?: number;
  retryDelayOnFailover?: number;
}

export interface SolanaConfig {
  rpcUrl: string;
  commitment?: string;
  privateKey?: string;
  programIds?: {
    stateOracle?: string;
    coordinator?: string;
  };
}

export interface NetworkConfig {
  [networkName: string]: {
    rpcUrl: string;
    chainId?: number;
    gasPrice?: string;
    maxGasLimit?: number;
  };
}

export interface ServiceConfiguration {
  service: {
    name: string;
    version: string;
    port: number;
    environment: 'development' | 'staging' | 'production';
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  database?: DatabaseConfig;
  redis?: RedisConfig;
  solana: SolanaConfig;
  networks?: NetworkConfig;
  security: {
    jwtSecret: string;
    corsOrigins: string[];
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    sentryDsn?: string;
    logRetentionDays: number;
  };
  blockchain: {
    retryAttempts: number;
    timeoutMs: number;
    confirmations: number;
  };
}

export class ConfigManager {
  private config: ServiceConfiguration;
  private logger: Logger;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = createLogger(`config-${serviceName}`);
    this.config = this.loadConfiguration();
  }

  /**
   * Load and validate configuration
   */
  private loadConfiguration(): ServiceConfiguration {
    try {
      const config = this.buildConfigFromEnvironment();
      this.validateConfiguration(config);

      this.logger.info('Configuration loaded successfully', {
        environment: config.service.environment,
        logLevel: config.service.logLevel,
        port: config.service.port
      });

      return config;
    } catch (error) {
      const configError = new ServiceError(
        `Configuration validation failed: ${String(error)}`,
        ErrorCode.VALIDATION_ERROR,
        500,
        { originalError: error },
        this.serviceName
      );

      this.logger.error('Configuration validation failed', configError);
      throw configError;
    }
  }

  /**
   * Build configuration from environment variables
   */
  private buildConfigFromEnvironment(): ServiceConfiguration {
    const config: ServiceConfiguration = {
      service: {
        name: this.serviceName,
        version: process.env.npm_package_version || '0.0.0',
        port: parseInt(process.env.PORT || '3000'),
        environment: (process.env.NODE_ENV as any) || 'development',
        logLevel: (process.env.LOG_LEVEL as any) || 'info'
      },

      solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        commitment: process.env.SOLANA_COMMITMENT || 'confirmed',
        privateKey: process.env.SOLANA_PRIVATE_KEY,
        programIds: {
          stateOracle: process.env.STATE_ORACLE_PROGRAM_ID,
          coordinator: process.env.COORDINATOR_PROGRAM_ID
        }
      },

      security: {
        jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-here',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
      },

      monitoring: {
        enableMetrics: process.env.ENABLE_METRICS !== 'false',
        enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
        sentryDsn: process.env.SENTRY_DSN,
        logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30')
      },

      blockchain: {
        retryAttempts: parseInt(process.env.BLOCKCHAIN_RETRY_ATTEMPTS || '3'),
        timeoutMs: parseInt(process.env.BLOCKCHAIN_TIMEOUT_MS || '30000'),
        confirmations: parseInt(process.env.BLOCKCHAIN_CONFIRMATIONS || '2')
      }
    };

    // Add database config if URL is provided
    if (process.env.DATABASE_URL) {
      config.database = {
        url: process.env.DATABASE_URL,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
      };
    }

    // Add Redis config if URL is provided
    if (process.env.REDIS_URL) {
      config.redis = {
        url: process.env.REDIS_URL,
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100')
      };
    }

    // Add network configurations
    config.networks = this.loadNetworkConfigurations();

    return config;
  }

  /**
   * Load network configurations from environment
   */
  private loadNetworkConfigurations(): NetworkConfig {
    const networks: NetworkConfig = {};

    // List of supported networks
    const supportedNetworks = [
      'ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche',
      'near', 'sui', 'aptos', 'cosmos', 'base', 'zksync', 'linea'
    ];

    for (const network of supportedNetworks) {
      const rpcUrlEnv = `${network.toUpperCase()}_RPC_URL`;
      const chainIdEnv = `${network.toUpperCase()}_CHAIN_ID`;
      const gasPriceEnv = `${network.toUpperCase()}_GAS_PRICE`;

      if (process.env[rpcUrlEnv]) {
        networks[network] = {
          rpcUrl: process.env[rpcUrlEnv]!,
          chainId: process.env[chainIdEnv] ? parseInt(process.env[chainIdEnv]) : undefined,
          gasPrice: process.env[gasPriceEnv]
        };
      }
    }

    return networks;
  }

  /**
   * Validate configuration using Joi schemas
   */
  private validateConfiguration(config: ServiceConfiguration): void {
    const schema = Joi.object({
      service: Joi.object({
        name: Joi.string().required(),
        version: Joi.string().required(),
        port: Joi.number().port().required(),
        environment: Joi.string().valid('development', 'staging', 'production').required(),
        logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').required()
      }).required(),

      database: Joi.object({
        url: Joi.string().uri().required(),
        maxConnections: Joi.number().min(1).max(100),
        idleTimeoutMillis: Joi.number().min(1000),
        connectionTimeoutMillis: Joi.number().min(500)
      }).optional(),

      redis: Joi.object({
        url: Joi.string().uri().required(),
        maxRetries: Joi.number().min(0).max(10),
        retryDelayOnFailover: Joi.number().min(10)
      }).optional(),

      solana: Joi.object({
        rpcUrl: Joi.string().uri().required(),
        commitment: Joi.string().valid('processed', 'confirmed', 'finalized'),
        privateKey: Joi.string().optional(),
        programIds: Joi.object({
          stateOracle: Joi.string().optional(),
          coordinator: Joi.string().optional()
        }).optional()
      }).required(),

      networks: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          rpcUrl: Joi.string().uri().required(),
          chainId: Joi.number().optional(),
          gasPrice: Joi.string().optional()
        })
      ).optional(),

      security: Joi.object({
        jwtSecret: Joi.string().min(32).required(),
        corsOrigins: Joi.array().items(Joi.string()).required(),
        rateLimitWindow: Joi.number().min(1000).required(),
        rateLimitMax: Joi.number().min(1).required()
      }).required(),

      monitoring: Joi.object({
        enableMetrics: Joi.boolean().required(),
        enableHealthChecks: Joi.boolean().required(),
        sentryDsn: Joi.string().uri().optional(),
        logRetentionDays: Joi.number().min(1).max(365).required()
      }).required(),

      blockchain: Joi.object({
        retryAttempts: Joi.number().min(0).max(10).required(),
        timeoutMs: Joi.number().min(1000).max(300000).required(),
        confirmations: Joi.number().min(0).max(100).required()
      }).required()
    });

    const { error } = schema.validate(config, { allowUnknown: false });

    if (error) {
      throw new Error(`Configuration validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    // Additional validation for production environment
    if (config.service.environment === 'production') {
      this.validateProductionConfig(config);
    }
  }

  /**
   * Additional validation for production environment
   */
  private validateProductionConfig(config: ServiceConfiguration): void {
    const issues: string[] = [];

    // Check for secure JWT secret
    if (config.security.jwtSecret === 'your-jwt-secret-here') {
      issues.push('JWT secret must be changed from default value in production');
    }

    // Check for HTTPS URLs in production
    if (!config.solana.rpcUrl.startsWith('https://')) {
      issues.push('Solana RPC URL should use HTTPS in production');
    }

    // Check for database SSL in production
    if (config.database && !config.database.url.includes('ssl=true')) {
      issues.push('Database connection should use SSL in production');
    }

    // Check for Sentry configuration in production
    if (!config.monitoring.sentryDsn) {
      issues.push('Sentry DSN should be configured for error monitoring in production');
    }

    if (issues.length > 0) {
      throw new Error(`Production configuration issues: ${issues.join(', ')}`);
    }
  }

  /**
   * Get complete configuration
   */
  getConfig(): ServiceConfiguration {
    return this.config;
  }

  /**
   * Get service configuration
   */
  getServiceConfig() {
    return this.config.service;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig | undefined {
    return this.config.database;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig(): RedisConfig | undefined {
    return this.config.redis;
  }

  /**
   * Get Solana configuration
   */
  getSolanaConfig(): SolanaConfig {
    return this.config.solana;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(networkName?: string): NetworkConfig | any {
    if (networkName) {
      return this.config.networks?.[networkName];
    }
    return this.config.networks || {};
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return this.config.security;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return this.config.monitoring;
  }

  /**
   * Get blockchain configuration
   */
  getBlockchainConfig() {
    return this.config.blockchain;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: 'metrics' | 'healthChecks'): boolean {
    switch (feature) {
      case 'metrics':
        return this.config.monitoring.enableMetrics;
      case 'healthChecks':
        return this.config.monitoring.enableHealthChecks;
      default:
        return false;
    }
  }

  /**
   * Get environment-specific values
   */
  isDevelopment(): boolean {
    return this.config.service.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.service.environment === 'production';
  }

  isStaging(): boolean {
    return this.config.service.environment === 'staging';
  }

  /**
   * Get configuration summary for logging (without sensitive data)
   */
  getConfigSummary() {
    return {
      service: this.config.service,
      hasDatabase: !!this.config.database,
      hasRedis: !!this.config.redis,
      networksConfigured: Object.keys(this.config.networks || {}).length,
      monitoring: {
        enableMetrics: this.config.monitoring.enableMetrics,
        enableHealthChecks: this.config.monitoring.enableHealthChecks,
        hasSentry: !!this.config.monitoring.sentryDsn
      },
      blockchain: this.config.blockchain
    };
  }
}