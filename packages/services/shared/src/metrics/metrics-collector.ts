/**
 * ChainSync Metrics Collector
 *
 * Provides comprehensive metrics collection and monitoring
 */

import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export interface MetricLabels {
  [key: string]: string | number;
}

export class MetricsCollector {
  private serviceName: string;
  private isStarted: boolean = false;

  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestsInFlight: Gauge<string>;

  // Database metrics
  private dbConnectionsActive: Gauge<string>;
  private dbQueryDuration: Histogram<string>;
  private dbQueryTotal: Counter<string>;

  // Blockchain metrics
  private blockchainRequestsTotal: Counter<string>;
  private blockchainRequestDuration: Histogram<string>;
  private blockchainConnectionsActive: Gauge<string>;

  // Business metrics
  private deploymentsTotal: Counter<string>;
  private deploymentDuration: Histogram<string>;
  private activeDeployments: Gauge<string>;
  private transactionsTotal: Counter<string>;
  private transactionFees: Histogram<string>;

  // System metrics
  private errorRate: Counter<string>;
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    const labelNames = ['service', 'method', 'status', 'endpoint'];
    const blockchainLabelNames = ['service', 'network', 'operation', 'status'];
    const dbLabelNames = ['service', 'operation', 'table', 'status'];

    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['service', 'method', 'endpoint', 'status'],
      registers: [register]
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['service', 'method', 'endpoint', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register]
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['service'],
      registers: [register]
    });

    // Database metrics
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['service', 'database'],
      registers: [register]
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: dbLabelNames,
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register]
    });

    this.dbQueryTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: dbLabelNames,
      registers: [register]
    });

    // Blockchain metrics
    this.blockchainRequestsTotal = new Counter({
      name: 'blockchain_requests_total',
      help: 'Total number of blockchain requests',
      labelNames: blockchainLabelNames,
      registers: [register]
    });

    this.blockchainRequestDuration = new Histogram({
      name: 'blockchain_request_duration_seconds',
      help: 'Duration of blockchain requests in seconds',
      labelNames: blockchainLabelNames,
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [register]
    });

    this.blockchainConnectionsActive = new Gauge({
      name: 'blockchain_connections_active',
      help: 'Number of active blockchain connections',
      labelNames: ['service', 'network'],
      registers: [register]
    });

    // Business metrics
    this.deploymentsTotal = new Counter({
      name: 'chainsync_deployments_total',
      help: 'Total number of cross-chain deployments',
      labelNames: ['service', 'status', 'chain_count'],
      registers: [register]
    });

    this.deploymentDuration = new Histogram({
      name: 'chainsync_deployment_duration_seconds',
      help: 'Duration of cross-chain deployments in seconds',
      labelNames: ['service', 'chain_count'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600],
      registers: [register]
    });

    this.activeDeployments = new Gauge({
      name: 'chainsync_active_deployments',
      help: 'Number of active deployments being processed',
      labelNames: ['service'],
      registers: [register]
    });

    this.transactionsTotal = new Counter({
      name: 'chainsync_transactions_total',
      help: 'Total number of cross-chain transactions',
      labelNames: ['service', 'network', 'status'],
      registers: [register]
    });

    this.transactionFees = new Histogram({
      name: 'chainsync_transaction_fees',
      help: 'Transaction fees collected',
      labelNames: ['service', 'network', 'currency'],
      buckets: [0.001, 0.01, 0.1, 1, 10, 100, 1000],
      registers: [register]
    });

    // System metrics
    this.errorRate = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['service', 'error_type', 'operation'],
      registers: [register]
    });

    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['service', 'type'],
      registers: [register]
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['service'],
      registers: [register]
    });
  }

  /**
   * Start metrics collection
   */
  start(): void {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;

    // Collect default Node.js metrics
    collectDefaultMetrics({
      register,
      prefix: `${this.serviceName}_`,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    // Start periodic system metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    this.isStarted = false;
    register.clear();
  }

  /**
   * Get all metrics
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = {
      service: this.serviceName,
      method,
      endpoint,
      status: statusCode.toString()
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
  }

  /**
   * Record HTTP request start (for in-flight tracking)
   */
  recordHttpRequestStart(): () => void {
    this.httpRequestsInFlight.inc({ service: this.serviceName });

    return () => {
      this.httpRequestsInFlight.dec({ service: this.serviceName });
    };
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    duration: number
  ): void {
    const labels = {
      service: this.serviceName,
      operation,
      table,
      status: success ? 'success' : 'error'
    };

    this.dbQueryTotal.inc(labels);
    this.dbQueryDuration.observe(labels, duration / 1000);
  }

  /**
   * Set active database connections
   */
  setDatabaseConnections(database: string, count: number): void {
    this.dbConnectionsActive.set({ service: this.serviceName, database }, count);
  }

  /**
   * Record blockchain operation metrics
   */
  recordBlockchainOperation(
    network: string,
    operation: string,
    success: boolean,
    duration: number
  ): void {
    const labels = {
      service: this.serviceName,
      network,
      operation,
      status: success ? 'success' : 'error'
    };

    this.blockchainRequestsTotal.inc(labels);
    this.blockchainRequestDuration.observe(labels, duration / 1000);
  }

  /**
   * Set active blockchain connections
   */
  setBlockchainConnections(network: string, count: number): void {
    this.blockchainConnectionsActive.set({ service: this.serviceName, network }, count);
  }

  /**
   * Record deployment metrics
   */
  recordDeployment(status: 'success' | 'failed', chainCount: number, duration: number): void {
    const labels = {
      service: this.serviceName,
      status,
      chain_count: chainCount.toString()
    };

    this.deploymentsTotal.inc(labels);
    this.deploymentDuration.observe(
      { service: this.serviceName, chain_count: chainCount.toString() },
      duration / 1000
    );
  }

  /**
   * Set active deployments count
   */
  setActiveDeployments(count: number): void {
    this.activeDeployments.set({ service: this.serviceName }, count);
  }

  /**
   * Record transaction metrics
   */
  recordTransaction(network: string, status: 'success' | 'failed'): void {
    this.transactionsTotal.inc({
      service: this.serviceName,
      network,
      status
    });
  }

  /**
   * Record transaction fee
   */
  recordTransactionFee(network: string, currency: string, amount: number): void {
    this.transactionFees.observe({
      service: this.serviceName,
      network,
      currency
    }, amount);
  }

  /**
   * Record error
   */
  recordError(errorType: string, operation: string): void {
    this.errorRate.inc({
      service: this.serviceName,
      error_type: errorType,
      operation
    });
  }

  /**
   * Create a timer for measuring operation duration
   */
  createTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Create HTTP middleware for automatic metrics collection
   */
  httpMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const endInFlight = this.recordHttpRequestStart();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        );
        endInFlight();
      });

      next();
    };
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    this.memoryUsage.set({ service: this.serviceName, type: 'heap_used' }, memUsage.heapUsed);
    this.memoryUsage.set({ service: this.serviceName, type: 'heap_total' }, memUsage.heapTotal);
    this.memoryUsage.set({ service: this.serviceName, type: 'external' }, memUsage.external);
    this.memoryUsage.set({ service: this.serviceName, type: 'rss' }, memUsage.rss);

    // CPU usage would require additional libraries, skipping for now
    // this.cpuUsage.set({ service: this.serviceName }, cpuPercent);
  }

  /**
   * Get service-specific metrics summary
   */
  getServiceMetrics() {
    return {
      service: this.serviceName,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      pid: process.pid
    };
  }
}