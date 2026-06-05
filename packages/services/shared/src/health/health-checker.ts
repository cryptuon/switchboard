/**
 * Switchboard Health Checker
 *
 * Provides comprehensive health monitoring for services
 */

import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';

export type HealthCheckStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface HealthCheck {
  name: string;
  description: string;
  check: () => Promise<HealthCheckResult>;
  required: boolean;
  timeout?: number;
  interval?: number;
}

export interface HealthCheckResult {
  status: HealthCheckStatus;
  message?: string;
  details?: any;
  duration?: number;
  timestamp: Date;
}

export interface HealthStatus {
  status: HealthCheckStatus;
  timestamp: Date;
  service: string;
  version: string;
  uptime: number;
  checks: { [name: string]: HealthCheckResult };
}

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;
  private serviceName: string;
  private isRunning: boolean = false;

  constructor(serviceName: string, logger: Logger) {
    this.serviceName = serviceName;
    this.logger = logger;
  }

  /**
   * Add a health check
   */
  addCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    this.logger.debug('Added health check', {
      checkName: check.name,
      required: check.required,
      interval: check.interval
    });
  }

  /**
   * Remove a health check
   */
  removeCheck(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);

    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    this.logger.debug('Removed health check', { checkName: name });
  }

  /**
   * Start health monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting health checker', {
      checkCount: this.checks.size
    });

    // Run initial checks
    await this.runAllChecks();

    // Setup periodic checks
    for (const [name, check] of this.checks) {
      if (check.interval && check.interval > 0) {
        const interval = setInterval(async () => {
          await this.runCheck(name);
        }, check.interval);

        this.intervals.set(name, interval);
      }
    }
  }

  /**
   * Stop health monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping health checker');

    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  /**
   * Get current health status
   */
  async getStatus(): Promise<HealthStatus> {
    if (!this.isRunning) {
      await this.runAllChecks();
    }

    const checkResults: { [name: string]: HealthCheckResult } = {};
    for (const [name, result] of this.results) {
      checkResults[name] = result;
    }

    const overallStatus = this.calculateOverallStatus();

    return {
      status: overallStatus,
      timestamp: new Date(),
      service: this.serviceName,
      version: process.env.npm_package_version || '0.0.0',
      uptime: process.uptime() * 1000,
      checks: checkResults
    };
  }

  /**
   * Run a specific health check
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new ServiceError(
        `Health check not found: ${name}`,
        ErrorCode.NOT_FOUND,
        404,
        { checkName: name },
        this.serviceName
      );
    }

    const start = Date.now();
    const timeout = check.timeout || 5000;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), timeout);
      });

      const result = await Promise.race([
        check.check(),
        timeoutPromise
      ]);

      result.duration = Date.now() - start;
      result.timestamp = new Date();

      this.results.set(name, result);

      if (result.status !== 'healthy') {
        this.logger.warn('Health check failed', {
          checkName: name,
          status: result.status,
          message: result.message,
          duration: result.duration
        });
      } else {
        this.logger.debug('Health check passed', {
          checkName: name,
          duration: result.duration
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - start;
      const result: HealthCheckResult = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.stack : error }
      };

      this.results.set(name, result);

      this.logger.error('Health check error', error, {
        checkName: name,
        duration
      });

      return result;
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<void> {
    const checkPromises = Array.from(this.checks.keys()).map(name =>
      this.runCheck(name).catch(error =>
        this.logger.error('Failed to run health check', error, { checkName: name })
      )
    );

    await Promise.allSettled(checkPromises);
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallStatus(): HealthCheckStatus {
    if (this.results.size === 0) {
      return 'healthy';
    }

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const [name, result] of this.results) {
      const check = this.checks.get(name);
      if (!check) continue;

      if (result.status === 'unhealthy') {
        if (check.required) {
          return 'unhealthy'; // Required check failed
        } else {
          hasDegraded = true; // Optional check failed
        }
      } else if (result.status === 'degraded') {
        hasDegraded = true;
      }
    }

    if (hasUnhealthy) {
      return 'unhealthy';
    } else if (hasDegraded) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Get check statistics
   */
  getStats() {
    const totalChecks = this.checks.size;
    const healthyChecks = Array.from(this.results.values())
      .filter(r => r.status === 'healthy').length;
    const unhealthyChecks = Array.from(this.results.values())
      .filter(r => r.status === 'unhealthy').length;
    const degradedChecks = Array.from(this.results.values())
      .filter(r => r.status === 'degraded').length;

    return {
      totalChecks,
      healthyChecks,
      unhealthyChecks,
      degradedChecks,
      successRate: totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100
    };
  }
}

/**
 * Common health check implementations
 */
export class CommonHealthChecks {
  /**
   * Database connection health check
   */
  static database(
    name: string,
    connectionTest: () => Promise<boolean>,
    description: string = 'Database connectivity'
  ): HealthCheck {
    return {
      name,
      description,
      required: true,
      timeout: 5000,
      interval: 30000,
      check: async (): Promise<HealthCheckResult> => {
        try {
          const isConnected = await connectionTest();
          return {
            status: isConnected ? 'healthy' : 'unhealthy',
            message: isConnected ? 'Database connected' : 'Database disconnected',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `Database error: ${String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.stack : error }
          };
        }
      }
    };
  }

  /**
   * External service health check
   */
  static externalService(
    name: string,
    url: string,
    description?: string
  ): HealthCheck {
    return {
      name,
      description: description || `External service: ${url}`,
      required: false,
      timeout: 10000,
      interval: 60000,
      check: async (): Promise<HealthCheckResult> => {
        try {
          const start = Date.now();
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });

          const duration = Date.now() - start;
          const isHealthy = response.status >= 200 && response.status < 400;

          return {
            status: isHealthy ? 'healthy' : 'degraded',
            message: `HTTP ${response.status}`,
            timestamp: new Date(),
            duration,
            details: { statusCode: response.status, url }
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `Service unreachable: ${String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.stack : error, url }
          };
        }
      }
    };
  }

  /**
   * Memory usage health check
   */
  static memory(
    name: string = 'memory',
    warningThreshold: number = 0.8,
    criticalThreshold: number = 0.9
  ): HealthCheck {
    return {
      name,
      description: 'Memory usage monitoring',
      required: false,
      timeout: 1000,
      interval: 30000,
      check: async (): Promise<HealthCheckResult> => {
        const memUsage = process.memoryUsage();
        const totalMemory = memUsage.heapTotal;
        const usedMemory = memUsage.heapUsed;
        const usageRatio = usedMemory / totalMemory;

        let status: HealthCheckStatus;
        let message: string;

        if (usageRatio >= criticalThreshold) {
          status = 'unhealthy';
          message = `Critical memory usage: ${Math.round(usageRatio * 100)}%`;
        } else if (usageRatio >= warningThreshold) {
          status = 'degraded';
          message = `High memory usage: ${Math.round(usageRatio * 100)}%`;
        } else {
          status = 'healthy';
          message = `Memory usage: ${Math.round(usageRatio * 100)}%`;
        }

        return {
          status,
          message,
          timestamp: new Date(),
          details: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024),
            usagePercentage: Math.round(usageRatio * 100)
          }
        };
      }
    };
  }

  /**
   * Disk space health check
   */
  static diskSpace(
    name: string = 'disk',
    path: string = '.',
    warningThreshold: number = 0.8,
    criticalThreshold: number = 0.9
  ): HealthCheck {
    return {
      name,
      description: `Disk space monitoring for ${path}`,
      required: false,
      timeout: 2000,
      interval: 300000, // 5 minutes
      check: async (): Promise<HealthCheckResult> => {
        try {
          const fs = await import('fs');
          const stats = await fs.promises.statfs(path);

          const total = stats.blocks * stats.bsize;
          const free = stats.bavail * stats.bsize;
          const used = total - free;
          const usageRatio = used / total;

          let status: HealthCheckStatus;
          let message: string;

          if (usageRatio >= criticalThreshold) {
            status = 'unhealthy';
            message = `Critical disk usage: ${Math.round(usageRatio * 100)}%`;
          } else if (usageRatio >= warningThreshold) {
            status = 'degraded';
            message = `High disk usage: ${Math.round(usageRatio * 100)}%`;
          } else {
            status = 'healthy';
            message = `Disk usage: ${Math.round(usageRatio * 100)}%`;
          }

          return {
            status,
            message,
            timestamp: new Date(),
            details: {
              path,
              totalGB: Math.round(total / 1024 / 1024 / 1024),
              usedGB: Math.round(used / 1024 / 1024 / 1024),
              freeGB: Math.round(free / 1024 / 1024 / 1024),
              usagePercentage: Math.round(usageRatio * 100)
            }
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `Failed to check disk space: ${String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.stack : error, path }
          };
        }
      }
    };
  }
}