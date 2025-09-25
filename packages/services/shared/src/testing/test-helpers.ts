/**
 * ChainSync Testing Helpers
 *
 * Shared testing utilities for ChainSync services
 */

import { Connection } from 'mongoose';
import { Logger } from '../logging/logger';
import { MetricsCollector } from '../metrics/metrics-collector';
import { DatabaseConnectionManager } from '../database/connection-manager';

export interface TestConfig {
  database: {
    url?: string;
    name?: string;
  };
  logging?: {
    level?: string;
    silent?: boolean;
  };
  metrics?: {
    enabled?: boolean;
  };
}

/**
 * Test environment setup helper
 */
export class TestEnvironment {
  private dbConnection?: DatabaseConnectionManager;
  private logger?: Logger;
  private metricsCollector?: MetricsCollector;

  constructor(private config: TestConfig = {}) {}

  /**
   * Setup test environment
   */
  async setup(): Promise<{
    db?: DatabaseConnectionManager;
    logger: Logger;
    metrics?: MetricsCollector;
  }> {
    // Setup logger
    this.logger = new Logger('test', {
      level: this.config.logging?.level || 'error',
      silent: this.config.logging?.silent !== false
    });

    // Setup metrics if enabled
    if (this.config.metrics?.enabled) {
      this.metricsCollector = new MetricsCollector('test');
      this.metricsCollector.start();
    }

    // Setup database if configured
    if (this.config.database?.url) {
      this.dbConnection = new DatabaseConnectionManager(
        {
          url: this.config.database.url,
          maxConnections: 5
        },
        'test',
        this.logger,
        // Mock retry manager for tests
        {
          withRetry: async (operation, _name) => operation()
        } as any,
        this.metricsCollector
      );

      await this.dbConnection.connect();
    }

    return {
      db: this.dbConnection,
      logger: this.logger,
      metrics: this.metricsCollector
    };
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.disconnect();
    }

    if (this.metricsCollector) {
      this.metricsCollector.stop();
    }
  }
}

/**
 * Mock implementations for testing
 */
export class MockLogger implements Logger {
  private logs: Array<{ level: string; message: string; context?: any }> = [];

  debug(message: string, context?: any): void {
    this.logs.push({ level: 'debug', message, context });
  }

  info(message: string, context?: any): void {
    this.logs.push({ level: 'info', message, context });
  }

  warn(message: string, context?: any): void {
    this.logs.push({ level: 'warn', message, context });
  }

  error(message: string, error?: any, context?: any): void {
    this.logs.push({ level: 'error', message, context: { error, ...context } });
  }

  httpRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.logs.push({
      level: 'info',
      message: 'HTTP Request',
      context: { method, path, statusCode, duration }
    });
  }

  blockchainOperation(operation: string, networkName: string, success: boolean): void {
    this.logs.push({
      level: 'info',
      message: 'Blockchain Operation',
      context: { operation, networkName, success }
    });
  }

  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.logs.push({
        level: 'debug',
        message: `Timer: ${label}`,
        context: { duration }
      });
    };
  }

  getLogs(): Array<{ level: string; message: string; context?: any }> {
    return [...this.logs];
  }

  getLogsByLevel(level: string): Array<{ level: string; message: string; context?: any }> {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs.length = 0;
  }
}

/**
 * Mock metrics collector for testing
 */
export class MockMetricsCollector {
  private metrics: Map<string, any> = new Map();

  start(): void {
    // No-op for testing
  }

  stop(): void {
    this.metrics.clear();
  }

  async getMetrics(): Promise<string> {
    return JSON.stringify(Object.fromEntries(this.metrics));
  }

  recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
    const key = `http_${method}_${endpoint}`;
    this.metrics.set(key, { method, endpoint, statusCode, duration });
  }

  recordDatabaseOperation(operation: string, table: string, success: boolean, duration: number): void {
    const key = `db_${operation}_${table}`;
    this.metrics.set(key, { operation, table, success, duration });
  }

  recordBlockchainOperation(network: string, operation: string, success: boolean, duration: number): void {
    const key = `blockchain_${network}_${operation}`;
    this.metrics.set(key, { network, operation, success, duration });
  }

  recordDeployment(status: 'success' | 'failed', chainCount: number, duration: number): void {
    this.metrics.set('deployment', { status, chainCount, duration });
  }

  recordTransaction(network: string, status: 'success' | 'failed'): void {
    this.metrics.set(`transaction_${network}`, { network, status });
  }

  recordError(errorType: string, operation: string): void {
    this.metrics.set(`error_${errorType}`, { errorType, operation });
  }

  createTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  getMetric(key: string): any {
    return this.metrics.get(key);
  }

  getAllMetrics(): { [key: string]: any } {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Database test utilities
 */
export class DatabaseTestUtils {
  constructor(private connection: Connection) {}

  /**
   * Clear all collections in test database
   */
  async clearDatabase(): Promise<void> {
    const collections = await this.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }

  /**
   * Drop test database
   */
  async dropDatabase(): Promise<void> {
    await this.connection.dropDatabase();
  }

  /**
   * Create test data
   */
  async createTestDeployment(data: Partial<any> = {}): Promise<any> {
    return {
      deploymentId: `test-deployment-${Date.now()}`,
      contractCode: 'test-contract-code',
      chains: [
        { name: 'ethereum', status: 'pending' },
        { name: 'polygon', status: 'pending' }
      ],
      status: 'pending',
      initiatedBy: 'test-user',
      metadata: {
        totalChains: 2,
        completedChains: 0,
        failedChains: 0
      },
      ...data
    };
  }

  async createTestTransaction(data: Partial<any> = {}): Promise<any> {
    return {
      transactionId: `test-tx-${Date.now()}`,
      chain: 'ethereum',
      transactionHash: `0x${Math.random().toString(16).slice(2)}`,
      status: 'pending',
      confirmations: 0,
      requiredConfirmations: 2,
      metadata: {},
      ...data
    };
  }
}

/**
 * Mock HTTP responses for testing external API calls
 */
export class MockHttpServer {
  private responses: Map<string, any> = new Map();

  /**
   * Mock a response for a specific URL and method
   */
  mockResponse(url: string, method: string, response: {
    status: number;
    data: any;
    headers?: Record<string, string>;
  }): void {
    const key = `${method.toUpperCase()}:${url}`;
    this.responses.set(key, response);
  }

  /**
   * Get mocked response
   */
  getResponse(url: string, method: string): any {
    const key = `${method.toUpperCase()}:${url}`;
    return this.responses.get(key);
  }

  /**
   * Clear all mocked responses
   */
  clear(): void {
    this.responses.clear();
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /**
   * Generate random hex string (for transaction hashes, etc.)
   */
  static randomHex(length: number = 64): string {
    return '0x' + Array.from({ length }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Generate test deployment data
   */
  static deployment(overrides: Partial<any> = {}): any {
    return {
      deploymentId: `deploy_${this.randomString()}`,
      contractCode: `contract Test { /* ${this.randomString()} */ }`,
      chains: ['ethereum', 'polygon'],
      initiatedBy: `user_${this.randomString()}`,
      config: {
        gasLimit: 5000000,
        gasPrice: '20000000000'
      },
      ...overrides
    };
  }

  /**
   * Generate test transaction data
   */
  static transaction(overrides: Partial<any> = {}): any {
    return {
      transactionId: `tx_${this.randomString()}`,
      chain: 'ethereum',
      transactionHash: this.randomHex(),
      status: 'pending',
      confirmations: 0,
      requiredConfirmations: 2,
      fromAddress: this.randomHex(40),
      toAddress: this.randomHex(40),
      value: '1000000000000000000', // 1 ETH in wei
      ...overrides
    };
  }
}

/**
 * Async test utilities
 */
export class AsyncTestUtils {
  /**
   * Wait for a condition to become true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Sleep for specified milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for an event to be emitted
   */
  static async waitForEvent(
    emitter: any,
    eventName: string,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        emitter.removeListener(eventName, handler);
        reject(new Error(`Event '${eventName}' not emitted within ${timeout}ms`));
      }, timeout);

      const handler = (...args: any[]) => {
        clearTimeout(timer);
        resolve(args.length === 1 ? args[0] : args);
      };

      emitter.once(eventName, handler);
    });
  }
}