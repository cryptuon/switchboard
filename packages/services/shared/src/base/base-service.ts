/**
 * ChainSync Base Service Architecture
 *
 * Provides common functionality for all ChainSync services
 */

import { EventEmitter } from 'events';
import { Logger, createLogger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { RetryManager, CircuitBreaker, CircuitBreakerConfig } from '../retry/retry-manager';
import { HealthChecker, HealthStatus } from '../health/health-checker';
import { MetricsCollector } from '../metrics/metrics-collector';
import { ConfigManager } from '../config/config-manager';

export enum ServiceState {
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

export interface ServiceConfig {
  name: string;
  version: string;
  port?: number;
  logLevel?: string;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  shutdownTimeout?: number;
  retryConfig?: any;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

export interface ServiceDependency {
  name: string;
  required: boolean;
  healthCheck: () => Promise<boolean>;
}

export abstract class BaseService extends EventEmitter {
  protected readonly logger: Logger;
  protected readonly config: ServiceConfig;
  protected readonly configManager: ConfigManager;
  protected readonly retryManager: RetryManager;
  protected readonly healthChecker: HealthChecker;
  protected readonly metricsCollector?: MetricsCollector;
  protected readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private state: ServiceState = ServiceState.INITIALIZING;
  private startTime?: Date;
  private dependencies: ServiceDependency[] = [];
  private shutdownHandlers: Array<() => Promise<void>> = [];

  constructor(config: ServiceConfig) {
    super();

    this.config = config;
    this.logger = createLogger(config.name, config.logLevel as any);
    this.configManager = new ConfigManager(config.name);
    this.retryManager = new RetryManager(this.logger, config.retryConfig);

    if (config.enableHealthChecks !== false) {
      this.healthChecker = new HealthChecker(config.name, this.logger);
    }

    if (config.enableMetrics !== false) {
      this.metricsCollector = new MetricsCollector(config.name);
    }

    // Setup shutdown handlers
    this.setupShutdownHandlers();

    this.logger.info('Service initialized', {
      serviceName: config.name,
      version: config.version
    });
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    if (this.state !== ServiceState.INITIALIZING) {
      throw new ServiceError(
        `Cannot start service in state: ${this.state}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        { currentState: this.state },
        this.config.name
      );
    }

    const timer = this.logger.time('service-startup');

    try {
      this.logger.info('Starting service');

      // Check dependencies
      await this.checkDependencies();

      // Initialize the service
      await this.initialize();

      // Start health checks
      if (this.healthChecker) {
        await this.healthChecker.start();
      }

      // Start metrics collection
      if (this.metricsCollector) {
        this.metricsCollector.start();
      }

      this.state = ServiceState.RUNNING;
      this.startTime = new Date();

      this.emit('started');
      this.logger.info('Service started successfully');

    } catch (error) {
      this.state = ServiceState.ERROR;
      const serviceError = error instanceof ServiceError ? error :
        new ServiceError(
          `Failed to start service: ${error.message}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          { originalError: error },
          this.config.name
        );

      this.logger.error('Failed to start service', serviceError);
      this.emit('error', serviceError);
      throw serviceError;
    } finally {
      timer();
    }
  }

  /**
   * Stop the service gracefully
   */
  async stop(): Promise<void> {
    if (this.state === ServiceState.STOPPED || this.state === ServiceState.STOPPING) {
      return;
    }

    this.state = ServiceState.STOPPING;
    this.logger.info('Stopping service');

    const timer = this.logger.time('service-shutdown');

    try {
      // Stop accepting new requests (implemented by subclasses)
      await this.beforeShutdown();

      // Run shutdown handlers
      await this.runShutdownHandlers();

      // Stop health checks
      if (this.healthChecker) {
        await this.healthChecker.stop();
      }

      // Stop metrics collection
      if (this.metricsCollector) {
        this.metricsCollector.stop();
      }

      // Cleanup resources
      await this.cleanup();

      this.state = ServiceState.STOPPED;
      this.emit('stopped');
      this.logger.info('Service stopped successfully');

    } catch (error) {
      this.logger.error('Error during service shutdown', error);
      this.state = ServiceState.ERROR;
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<HealthStatus> {
    if (!this.healthChecker) {
      return {
        status: 'healthy',
        timestamp: new Date(),
        service: this.config.name,
        version: this.config.version,
        uptime: this.getUptime(),
        checks: {}
      };
    }

    return await this.healthChecker.getStatus();
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    if (!this.metricsCollector) {
      return null;
    }

    return this.metricsCollector.getMetrics();
  }

  /**
   * Add a service dependency
   */
  protected addDependency(dependency: ServiceDependency): void {
    this.dependencies.push(dependency);
  }

  /**
   * Add a shutdown handler
   */
  protected addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Get or create a circuit breaker for an external service
   */
  protected getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const config = this.config.circuitBreakerConfig || {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        resetTimeout: 30000
      };

      this.circuitBreakers.set(
        serviceName,
        new CircuitBreaker(this.logger, config)
      );
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Execute operation with retry and circuit breaker
   */
  protected async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    serviceName?: string
  ): Promise<T> {
    const wrappedOperation = serviceName
      ? () => this.getCircuitBreaker(serviceName).execute(operation, operationName)
      : operation;

    return this.retryManager.withRetry(wrappedOperation, operationName);
  }

  /**
   * Get service state
   */
  getState(): ServiceState {
    return this.state;
  }

  /**
   * Get service uptime in milliseconds
   */
  getUptime(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  /**
   * Get service information
   */
  getInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      state: this.state,
      uptime: this.getUptime(),
      startTime: this.startTime,
      dependencies: this.dependencies.map(d => ({ name: d.name, required: d.required })),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
        name,
        ...cb.getStats()
      }))
    };
  }

  // Abstract methods that must be implemented by subclasses

  /**
   * Initialize the service - called during startup
   */
  protected abstract initialize(): Promise<void>;

  /**
   * Cleanup resources - called during shutdown
   */
  protected abstract cleanup(): Promise<void>;

  /**
   * Called before shutdown starts - opportunity to stop accepting new requests
   */
  protected abstract beforeShutdown(): Promise<void>;

  // Private methods

  private async checkDependencies(): Promise<void> {
    this.logger.info('Checking service dependencies', {
      dependencyCount: this.dependencies.length
    });

    const results = await Promise.allSettled(
      this.dependencies.map(async (dep) => {
        try {
          const isHealthy = await dep.healthCheck();
          return { name: dep.name, required: dep.required, healthy: isHealthy };
        } catch (error) {
          return { name: dep.name, required: dep.required, healthy: false, error };
        }
      })
    );

    const failedRequired = results
      .map((result, index) => ({ result, dep: this.dependencies[index] }))
      .filter(({ result, dep }) =>
        result.status === 'fulfilled' &&
        dep.required &&
        !result.value.healthy
      );

    if (failedRequired.length > 0) {
      const failedNames = failedRequired.map(({ dep }) => dep.name);
      throw new ServiceError(
        `Required dependencies are unhealthy: ${failedNames.join(', ')}`,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        503,
        { failedDependencies: failedNames },
        this.config.name
      );
    }

    this.logger.info('Dependency check completed', {
      total: this.dependencies.length,
      required: this.dependencies.filter(d => d.required).length,
      optional: this.dependencies.filter(d => !d.required).length
    });
  }

  private async runShutdownHandlers(): Promise<void> {
    this.logger.debug('Running shutdown handlers', {
      handlerCount: this.shutdownHandlers.length
    });

    const timeout = this.config.shutdownTimeout || 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), timeout);
    });

    try {
      await Promise.race([
        Promise.all(this.shutdownHandlers.map(handler => handler())),
        timeoutPromise
      ]);
    } catch (error) {
      this.logger.error('Error running shutdown handlers', error);
      throw error;
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', reason, { promise });
      shutdown('unhandledRejection');
    });
  }
}