/**
 * ChainSync Retry Management
 *
 * Provides configurable retry logic with exponential backoff
 */

import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: ErrorCode[];
  nonRetryableErrors?: ErrorCode[];
}

export interface RetryContext {
  attempt: number;
  maxRetries: number;
  lastError?: Error;
  totalDuration: number;
  operation: string;
}

export type RetryCondition = (error: Error, context: RetryContext) => boolean;

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    ErrorCode.RPC_CONNECTION_ERROR,
    ErrorCode.DATABASE_ERROR,
    ErrorCode.INTERNAL_ERROR
  ],
  nonRetryableErrors: [
    ErrorCode.VALIDATION_ERROR,
    ErrorCode.UNAUTHORIZED,
    ErrorCode.NOT_FOUND
  ]
};

export class RetryManager {
  private logger: Logger;
  private config: RetryConfig;

  constructor(logger: Logger, config: Partial<RetryConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.config, ...config };
    const startTime = Date.now();

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      const context: RetryContext = {
        attempt,
        maxRetries: finalConfig.maxRetries,
        lastError,
        totalDuration: Date.now() - startTime,
        operation: operationName
      };

      try {
        const result = await operation();

        if (attempt > 1) {
          this.logger.info(
            `Operation succeeded after ${attempt} attempts`,
            { operation: operationName, attempt, totalDuration: context.totalDuration }
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt > finalConfig.maxRetries) {
          this.logger.error(
            `Operation failed after ${finalConfig.maxRetries + 1} attempts`,
            lastError,
            { operation: operationName, totalAttempts: attempt, totalDuration: context.totalDuration }
          );
          throw lastError;
        }

        // Check if error should be retried
        if (!this.shouldRetry(lastError, context, finalConfig)) {
          this.logger.error(
            `Operation failed with non-retryable error`,
            lastError,
            { operation: operationName, attempt, errorType: lastError.constructor.name }
          );
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, finalConfig);

        this.logger.warn(
          `Operation failed, retrying in ${delay}ms`,
          {
            operation: operationName,
            attempt,
            maxRetries: finalConfig.maxRetries,
            delay,
            error: lastError.message
          }
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Should never reach here
    throw lastError || new Error('Unexpected retry loop exit');
  }

  /**
   * Execute multiple operations with retry logic in parallel
   */
  async withRetryAll<T>(
    operations: Array<{ fn: () => Promise<T>; name: string }>,
    config?: Partial<RetryConfig>
  ): Promise<T[]> {
    const promises = operations.map(({ fn, name }) =>
      this.withRetry(fn, name, config)
    );

    return Promise.all(promises);
  }

  /**
   * Execute multiple operations with retry logic, but fail fast on first success pattern
   */
  async withRetryRace<T>(
    operations: Array<{ fn: () => Promise<T>; name: string }>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const promises = operations.map(({ fn, name }) =>
      this.withRetry(fn, name, config)
    );

    return Promise.race(promises);
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: Error, context: RetryContext, config: RetryConfig): boolean {
    // Check if we have any retries left
    if (context.attempt >= config.maxRetries + 1) {
      return false;
    }

    // If it's a ServiceError, check the error code
    if (error instanceof ServiceError) {
      // Check non-retryable errors first
      if (config.nonRetryableErrors?.includes(error.code)) {
        return false;
      }

      // Check retryable errors
      if (config.retryableErrors?.includes(error.code)) {
        return true;
      }

      // Default behavior for ServiceError - don't retry client errors (4xx)
      return error.statusCode >= 500;
    }

    // For other errors, retry by default (network issues, etc.)
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper for a specific operation
   */
  createRetryWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationName: string,
    config?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return (...args: T) => {
      return this.withRetry(() => fn(...args), operationName, config);
    };
  }
}

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  successThreshold: number;    // Number of successes to close from half-open
  timeout: number;            // Time to wait before trying again (ms)
  resetTimeout: number;       // Time to wait before transitioning to half-open (ms)
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private logger: Logger;
  private config: CircuitBreakerConfig;

  constructor(logger: Logger, config: CircuitBreakerConfig) {
    this.logger = logger;
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new ServiceError(
          `Circuit breaker is OPEN for ${operationName}`,
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          503
        );
      } else {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        this.logger.info(`Circuit breaker transitioning to HALF_OPEN for ${operationName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(operationName);
      throw error;
    }
  }

  private onSuccess(operationName: string) {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.logger.info(`Circuit breaker CLOSED for ${operationName}`);
      }
    }
  }

  private onFailure(operationName: string) {
    this.failureCount++;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.logger.error(
        `Circuit breaker OPENED for ${operationName}`,
        undefined,
        { failureCount: this.failureCount, nextAttempt: new Date(this.nextAttempt) }
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt
    };
  }
}