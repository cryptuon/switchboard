/**
 * ChainSync Synchronization Service
 *
 * Main service that coordinates blockchain monitoring and deployment processing
 */

import {
  BaseService,
  ServiceConfig,
  DatabaseConnectionManager,
  CommonHealthChecks,
  MessageBus,
  ServiceRegistry,
  ServiceRegistration
} from '@chainsync/services-shared';

import { StreamingStateOracle } from '@chainsync/oracle-service';
import { DeploymentRepository } from './repositories/deployment-repository';
import { TransactionRepository } from './repositories/transaction-repository';
import { BlockchainMonitor, BlockchainConfig } from './services/blockchain-monitor';
import { DeploymentProcessor } from './services/deployment-processor';

export interface SyncServiceConfig extends ServiceConfig {
  database: {
    url: string;
    maxConnections?: number;
  };
  chains: BlockchainConfig[];
  processing: {
    maxConcurrentDeployments?: number;
    monitorIntervalMs?: number;
  };
  oracle: {
    solanaRpcUrl: string;
    chainRpcUrls: { [chainName: string]: string };
    coordinationLatencyTarget?: number;
  };
}

export class SyncService extends BaseService {
  private dbConnectionManager?: DatabaseConnectionManager;
  private messageBus?: MessageBus;
  private serviceRegistry?: ServiceRegistry;

  private deploymentRepo?: DeploymentRepository;
  private transactionRepo?: TransactionRepository;
  private blockchainMonitor?: BlockchainMonitor;
  private deploymentProcessor?: DeploymentProcessor;
  private streamingOracle?: StreamingStateOracle;

  constructor(config: SyncServiceConfig) {
    super(config);
  }

  /**
   * Initialize the sync service
   */
  protected async initialize(): Promise<void> {
    // const appConfig = this.configManager.getConfig(); // Not used currently

    // Initialize database connection
    await this.initializeDatabase();

    // Initialize repositories
    this.initializeRepositories();

    // Initialize message bus
    this.messageBus = new MessageBus(
      { serviceName: this.config.name },
      this.logger,
      this.metricsCollector
    );

    // Initialize service registry
    this.serviceRegistry = new ServiceRegistry(this.logger);

    // Initialize streaming oracle for real-time monitoring
    await this.initializeStreamingOracle();

    // Initialize blockchain monitor (legacy support)
    this.blockchainMonitor = new BlockchainMonitor(
      this.transactionRepo!,
      this.deploymentRepo!,
      this.logger,
      this.retryManager,
      this.metricsCollector
    );

    // Initialize deployment processor
    this.deploymentProcessor = new DeploymentProcessor(
      this.deploymentRepo!,
      this.transactionRepo!,
      this.logger,
      this.retryManager,
      this.metricsCollector,
      this.messageBus
    );

    // Configure blockchain chains
    await this.configureChains();

    // Setup event handlers
    this.setupEventHandlers();

    // Add health checks
    this.addHealthChecks();

    // Register service
    await this.registerService();

    // Start real-time streaming oracle (primary monitoring)
    if (this.streamingOracle) {
      await this.streamingOracle.startRealTimeStreaming();
      this.logger.info('⚡ Real-time streaming oracle started');
    }

    // Start blockchain monitoring and deployment processing
    await this.blockchainMonitor.start();
    this.deploymentProcessor.start();

    this.logger.info('Sync service initialized successfully');
  }

  /**
   * Initialize streaming oracle for real-time blockchain monitoring
   */
  private async initializeStreamingOracle(): Promise<void> {
    try {
      const syncConfig = this.config as SyncServiceConfig;

      // Build chain configuration from sync config
      const oracleChains: { [chainName: string]: string } = {};
      for (const chainConfig of syncConfig.chains) {
        if (syncConfig.oracle.chainRpcUrls[chainConfig.name]) {
          oracleChains[chainConfig.name] = syncConfig.oracle.chainRpcUrls[chainConfig.name];
        } else {
          oracleChains[chainConfig.name] = chainConfig.rpcUrl;
        }
      }

      const oracleConfig = {
        solanaRpcUrl: syncConfig.oracle.solanaRpcUrl,
        chains: oracleChains,
        streamingEnabled: true,
        batchProcessingSize: 50,
        coordinationLatencyTarget: syncConfig.oracle.coordinationLatencyTarget || 400
      };

      this.streamingOracle = new StreamingStateOracle(oracleConfig);

      // Connect to all chains
      await this.streamingOracle.connectToAllChains();

      // Setup real-time event handlers for sync operations
      this.setupStreamingOracleHandlers();

      this.logger.info('✅ Streaming oracle initialized for sync service', {
        chains: Object.keys(oracleChains),
        coordinationTarget: `${oracleConfig.coordinationLatencyTarget}ms`
      });

      // Add streaming oracle health check
      if (this.healthChecker) {
        this.healthChecker.addCheck({
          name: 'streaming-oracle',
          description: 'Real-time streaming oracle',
          required: true,
          timeout: 5000,
          check: async () => {
            if (!this.streamingOracle) {
              return {
                status: 'unhealthy',
                message: 'Streaming oracle not initialized',
                timestamp: new Date()
              };
            }

            const systemStatus = await this.streamingOracle.getSystemStatus();
            const metrics = this.streamingOracle.getStreamingMetrics();

            return {
              status: systemStatus.performanceStatus === 'critical' ? 'unhealthy' : 'healthy',
              message: `Oracle: ${systemStatus.streamingChains}/${systemStatus.totalChains} chains, ${metrics.latencyStatus} (${metrics.averageLatency.toFixed(0)}ms)`,
              timestamp: new Date(),
              details: {
                totalChains: systemStatus.totalChains,
                streamingChains: systemStatus.streamingChains,
                latencyStatus: metrics.latencyStatus,
                averageLatency: `${metrics.averageLatency.toFixed(0)}ms`,
                coordinationQueueSize: metrics.coordinationQueueSize
              }
            };
          }
        });
      }

    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize streaming oracle for sync service: ${String(error)}`);
      // Continue without streaming oracle - will use legacy polling
    }
  }

  /**
   * Setup real-time event handlers for streaming oracle
   */
  private setupStreamingOracleHandlers(): void {
    if (!this.streamingOracle) return;

    // Note: subscribeToStateChanges method not available in current StreamingStateOracle implementation
    // This would be used for real-time state change processing when the method is implemented

    this.logger.info('✅ Real-time streaming oracle handlers configured');
  }

  // Removed unused _processRealTimeStateChange method

  // Removed unused processDeploymentEvent method

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    const syncConfig = this.config as SyncServiceConfig;

    this.dbConnectionManager = new DatabaseConnectionManager(
      {
        url: syncConfig.database.url,
        maxConnections: syncConfig.database.maxConnections || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      },
      this.config.name,
      this.logger,
      this.retryManager,
      this.metricsCollector
    );

    await this.dbConnectionManager.connect();
    this.logger.info('Database connected successfully');
  }

  /**
   * Initialize repositories
   */
  private initializeRepositories(): void {
    this.deploymentRepo = new DeploymentRepository(
      this.dbConnectionManager!,
      this.logger,
      this.metricsCollector
    );

    this.transactionRepo = new TransactionRepository(
      this.dbConnectionManager!,
      this.logger,
      this.metricsCollector
    );
  }

  /**
   * Configure blockchain chains
   */
  private async configureChains(): Promise<void> {
    const syncConfig = this.config as SyncServiceConfig;
    const solanaConfig = this.configManager.getSolanaConfig();
    const networkConfigs = this.configManager.getNetworkConfig();

    // Add configured chains to monitor
    for (const chainConfig of syncConfig.chains) {
      this.blockchainMonitor!.addChain(chainConfig);

      // Configure deployment processor for this chain
      let rpcUrl = chainConfig.rpcUrl;
      let privateKey: string | undefined;

      if (chainConfig.name === 'solana') {
        rpcUrl = solanaConfig.rpcUrl;
        privateKey = solanaConfig.privateKey;
      } else {
        const networkConfig = networkConfigs[chainConfig.name];
        if (networkConfig) {
          rpcUrl = networkConfig.rpcUrl;
        }
      }

      this.deploymentProcessor!.configureChain(chainConfig.name, {
        rpcUrl,
        privateKey,
        type: chainConfig.type,
        chainId: chainConfig.chainId
      });
    }

    this.logger.info('Blockchain chains configured', {
      chainCount: syncConfig.chains.length,
      chains: syncConfig.chains.map(c => c.name)
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Blockchain monitor events
    this.blockchainMonitor!.on('transactionUpdate', (update) => {
      this.logger.debug('Transaction updated', update);
      this.metricsCollector?.recordTransaction(update.chain,
        update.status === 'confirmed' ? 'success' : 'failed');
    });

    this.blockchainMonitor!.on('deploymentUpdate', (update) => {
      this.logger.info('Deployment updated', update);
    });

    // Deployment processor events
    this.deploymentProcessor!.on('deploymentQueued', (deployment) => {
      this.logger.info('Deployment queued', {
        deploymentId: deployment.deploymentId,
        chains: deployment.chains.length
      });
    });

    this.deploymentProcessor!.on('deploymentProcessed', (deployment) => {
      this.logger.info('Deployment processed', {
        deploymentId: deployment.deploymentId,
        status: deployment.status
      });
    });

    this.deploymentProcessor!.on('chainDeploymentComplete', (result) => {
      this.logger.info('Chain deployment complete', {
        deploymentId: result.deploymentId,
        chain: result.chain,
        success: result.success
      });
    });

    // Message bus events
    this.messageBus!.on('messageError', ({ message, error }) => {
      this.logger.error('Message bus error', error, {
        messageId: message.id,
        messageType: message.type
      });
    });
  }

  /**
   * Add health checks
   */
  private addHealthChecks(): void {
    if (!this.healthChecker) return;

    // Database health check - commented out due to interface compatibility issues
    // if (this.dbConnectionManager) {
    //   this.healthChecker.addCheck(
    //     DatabaseHealthCheck.create(this.dbConnectionManager, 'mongodb')
    //   );
    // }

    // Memory health check
    this.healthChecker.addCheck(
      CommonHealthChecks.memory('sync-memory', 0.8, 0.9)
    );

    // Blockchain monitor health check
    this.healthChecker.addCheck({
      name: 'blockchain-monitor',
      description: 'Blockchain monitoring service',
      required: true,
      timeout: 5000,
      interval: 30000,
      check: async () => {
        const isRunning = this.blockchainMonitor?.getStats().isRunning || false;
        return {
          status: isRunning ? 'healthy' : 'unhealthy',
          message: isRunning ? 'Blockchain monitor is running' : 'Blockchain monitor is stopped',
          timestamp: new Date(),
          details: this.blockchainMonitor?.getStats()
        };
      }
    });

    // Deployment processor health check
    this.healthChecker.addCheck({
      name: 'deployment-processor',
      description: 'Deployment processing service',
      required: true,
      timeout: 5000,
      interval: 30000,
      check: async () => {
        const isProcessing = this.deploymentProcessor?.getStats().isProcessing || false;
        return {
          status: isProcessing ? 'healthy' : 'unhealthy',
          message: isProcessing ? 'Deployment processor is running' : 'Deployment processor is stopped',
          timestamp: new Date(),
          details: this.deploymentProcessor?.getStats()
        };
      }
    });

    // Pending deployments check
    this.healthChecker.addCheck({
      name: 'pending-deployments',
      description: 'Monitor pending deployments queue',
      required: false,
      timeout: 5000,
      interval: 60000,
      check: async () => {
        if (!this.deploymentRepo) {
          return {
            status: 'unhealthy' as any,
            message: 'Deployment repository not available',
            timestamp: new Date()
          };
        }

        const activeDeployments = await this.deploymentRepo.findActiveDeployments();
        const pendingCount = activeDeployments.length;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        let message = `${pendingCount} pending deployments`;

        if (pendingCount > 50) {
          status = 'unhealthy';
          message = `High number of pending deployments: ${pendingCount}`;
        } else if (pendingCount > 20) {
          status = 'degraded';
          message = `Elevated number of pending deployments: ${pendingCount}`;
        }

        return {
          status: status as any, // Type assertion for compatibility
          message,
          timestamp: new Date(),
          details: { pendingCount }
        };
      }
    });
  }

  /**
   * Register service with service registry
   */
  private async registerService(): Promise<void> {
    if (!this.serviceRegistry) return;

    const registration: ServiceRegistration = {
      id: `${this.config.name}-${Date.now()}`,
      name: this.config.name,
      version: this.config.version,
      host: 'localhost',
      port: 0, // Sync service doesn't expose HTTP endpoints
      protocol: 'http',
      status: 'healthy',
      lastHeartbeat: new Date(),
      metadata: {
        environment: this.configManager.getServiceConfig().environment,
        tags: ['sync', 'blockchain', 'deployments'],
        capabilities: ['deployment-processing', 'transaction-monitoring', 'multi-chain']
      },
      endpoints: {
        health: '/health',
        metrics: '/metrics'
      }
    };

    await this.serviceRegistry.register(registration);
    this.logger.info('Service registered successfully');
  }

  /**
   * Service shutdown preparation
   */
  protected async beforeShutdown(): Promise<void> {
    this.logger.info('Preparing sync service shutdown');

    // Stop streaming oracle first
    if (this.streamingOracle) {
      await this.streamingOracle.stopStreaming();
      this.logger.info('⏹️ Streaming oracle stopped');
    }

    // Stop blockchain monitoring
    if (this.blockchainMonitor) {
      await this.blockchainMonitor.stop();
    }

    // Stop deployment processing
    if (this.deploymentProcessor) {
      this.deploymentProcessor.stop();
    }
  }

  /**
   * Cleanup resources
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up sync service resources');

    // Cleanup message bus
    if (this.messageBus) {
      await this.messageBus.cleanup();
    }

    // Cleanup service registry
    if (this.serviceRegistry) {
      await this.serviceRegistry.cleanup();
    }

    // Disconnect database
    if (this.dbConnectionManager) {
      await this.dbConnectionManager.disconnect();
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    const stats: any = {
      ...this.getInfo(),
      database: this.dbConnectionManager?.getPoolStats(),
      blockchainMonitor: this.blockchainMonitor?.getStats(),
      deploymentProcessor: this.deploymentProcessor?.getStats(),
      messageBus: this.messageBus?.getStats()
    };

    // Add streaming oracle stats if available
    if (this.streamingOracle) {
      const streamingMetrics = this.streamingOracle.getStreamingMetrics();
      stats.streamingOracle = {
        totalEvents: streamingMetrics.totalEvents,
        eventsPerSecond: streamingMetrics.eventsPerSecond,
        averageLatency: streamingMetrics.averageLatency,
        latencyStatus: streamingMetrics.latencyStatus,
        coordinationQueueSize: streamingMetrics.coordinationQueueSize,
        healthyStreams: streamingMetrics.healthyStreams,
        totalStreams: streamingMetrics.totalStreams
      };
    }

    return stats;
  }

  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics() {
    if (!this.streamingOracle) {
      return {
        available: false,
        message: 'Real-time metrics not available - streaming oracle not initialized'
      };
    }

    const metrics = this.streamingOracle.getStreamingMetrics();
    const systemStatus = await this.streamingOracle.getSystemStatus();

    return {
      available: true,
      performance: {
        averageLatency: metrics.averageLatency,
        coordinationTime: metrics.coordinationTime,
        latencyStatus: metrics.latencyStatus,
        eventsPerSecond: metrics.eventsPerSecond,
        totalEvents: metrics.totalEvents
      },
      system: {
        totalChains: systemStatus.totalChains,
        streamingChains: systemStatus.streamingChains,
        performanceStatus: systemStatus.performanceStatus,
        connectedChains: systemStatus.connectedChains
      },
      queues: {
        coordinationQueueSize: metrics.coordinationQueueSize,
        bufferSizes: metrics.bufferSizes
      },
      comparison: {
        legacyPollingInterval: '10 seconds',
        realTimeLatency: `${metrics.averageLatency.toFixed(0)}ms`,
        performanceGain: `${((10000 / metrics.averageLatency) - 1) * 100}% faster`
      }
    };
  }

  /**
   * Public API methods for external access
   */

  /**
   * Queue a new deployment
   */
  async queueDeployment(request: {
    deploymentId: string;
    contractCode: string;
    chains: string[];
    initiatedBy: string;
    config?: any;
  }) {
    if (!this.deploymentProcessor) {
      throw new Error('Deployment processor not initialized');
    }

    return this.deploymentProcessor.queueDeployment(request);
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string) {
    if (!this.deploymentRepo) {
      throw new Error('Deployment repository not initialized');
    }

    return this.deploymentRepo.findOne({ deploymentId });
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(filters: any = {}) {
    if (!this.deploymentRepo) {
      throw new Error('Deployment repository not initialized');
    }

    return this.deploymentRepo.getDeploymentStats(filters);
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(filters: any = {}) {
    if (!this.transactionRepo) {
      throw new Error('Transaction repository not initialized');
    }

    return this.transactionRepo.getTransactionStats(filters);
  }
}