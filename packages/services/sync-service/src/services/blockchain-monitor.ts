/**
 * Switchboard Blockchain Monitor
 *
 * Monitors blockchain transactions and events across multiple networks
 */

import { EventEmitter } from 'events';
import { Connection } from '@solana/web3.js';
import { ethers } from 'ethers';
import WebSocket from 'ws';

import {
  Logger,
  ServiceError,
  ErrorCode,
  RetryManager,
  MetricsCollector,
  CircuitBreaker
} from '@switchboard/services-shared';

import { TransactionRepository } from '../repositories/transaction-repository';
import { DeploymentRepository } from '../repositories/deployment-repository';

export interface BlockchainConfig {
  name: string;
  type: 'ethereum' | 'solana' | 'polygon' | 'arbitrum' | 'bsc';
  rpcUrl: string;
  wsUrl?: string;
  chainId?: number;
  confirmations: number;
  blockTime: number; // Average block time in seconds
}

export interface TransactionUpdate {
  transactionHash: string;
  chain: string;
  status: 'pending' | 'confirmed' | 'failed' | 'dropped';
  confirmations: number;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: number;
  error?: string;
}

export class BlockchainMonitor extends EventEmitter {
  private chains: Map<string, BlockchainConfig> = new Map();
  private providers: Map<string, any> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  private readonly logger: Logger;
  // private readonly _retryManager: RetryManager; // Unused currently
  private readonly metricsCollector?: MetricsCollector;
  private readonly transactionRepo: TransactionRepository;
  private readonly deploymentRepo: DeploymentRepository;

  private isRunning: boolean = false;
  private readonly monitorIntervalMs: number = 10000; // 10 seconds

  constructor(
    transactionRepo: TransactionRepository,
    deploymentRepo: DeploymentRepository,
    logger: Logger,
    _retryManager: RetryManager, // Unused currently
    metricsCollector?: MetricsCollector
  ) {
    super();
    this.transactionRepo = transactionRepo;
    this.deploymentRepo = deploymentRepo;
    this.logger = logger;
    // this._retryManager = retryManager;
    this.metricsCollector = metricsCollector;
  }

  /**
   * Add a blockchain to monitor
   */
  addChain(config: BlockchainConfig): void {
    this.chains.set(config.name, config);

    // Create circuit breaker for this chain
    this.circuitBreakers.set(config.name, new CircuitBreaker(this.logger, {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      resetTimeout: 30000
    }));

    this.logger.info('Added blockchain to monitor', {
      chain: config.name,
      type: config.type,
      rpcUrl: config.rpcUrl
    });
  }

  /**
   * Start monitoring all configured chains
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting blockchain monitor', {
      chainCount: this.chains.size
    });

    // Initialize providers for each chain
    for (const [chainName, config] of this.chains) {
      try {
        await this.initializeProvider(chainName, config);
        this.startChainMonitoring(chainName);
      } catch (error) {
        this.logger.error(`Failed to initialize provider for ${chainName}: ${String(error)}`);
      }
    }

    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping blockchain monitor');

    // Clear all intervals
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // Close all websockets
    for (const [chainName, ws] of this.websockets) {
      try {
        ws.close();
        this.logger.debug('Closed websocket', { chain: chainName });
      } catch (error) {
        this.logger.error('Error closing websocket', error, { chain: chainName });
      }
    }
    this.websockets.clear();

    // Clear providers
    this.providers.clear();

    this.emit('stopped');
  }

  /**
   * Initialize provider for a specific chain
   */
  private async initializeProvider(chainName: string, config: BlockchainConfig): Promise<void> {
    this.logger.debug('Initializing provider', { chain: chainName, type: config.type });

    try {
      let provider: any;

      switch (config.type) {
        case 'solana':
          provider = new Connection(config.rpcUrl, 'confirmed');
          break;

        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'bsc':
          provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
          break;

        default:
          throw new Error(`Unsupported chain type: ${config.type}`);
      }

      // Test connection
      await this.testProviderConnection(chainName, provider, config.type);

      this.providers.set(chainName, provider);

      // Setup websocket if available
      if (config.wsUrl) {
        await this.setupWebsocket(chainName, config);
      }

      this.logger.info('Provider initialized successfully', {
        chain: chainName,
        type: config.type
      });

    } catch (error) {
      this.metricsCollector?.recordError('provider_initialization', chainName);
      throw new ServiceError(
        `Failed to initialize provider for ${chainName}: ${String(error)}`,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        500,
        { chain: chainName, config, originalError: error },
        'blockchain-monitor'
      );
    }
  }

  /**
   * Test provider connection
   */
  private async testProviderConnection(chainName: string, provider: any, type: string): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      switch (type) {
        case 'solana':
          await provider.getVersion();
          break;

        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'bsc':
          await provider.getBlockNumber();
          break;
      }

      this.metricsCollector?.recordBlockchainOperation(
        chainName,
        'connection_test',
        true,
        timer?.() || 0
      );

    } catch (error) {
      this.metricsCollector?.recordBlockchainOperation(
        chainName,
        'connection_test',
        false,
        timer?.() || 0
      );
      throw error;
    }
  }

  /**
   * Setup websocket connection for real-time updates
   */
  private async setupWebsocket(chainName: string, config: BlockchainConfig): Promise<void> {
    if (!config.wsUrl) return;

    try {
      const ws = new WebSocket(config.wsUrl);

      ws.on('open', () => {
        this.logger.debug('Websocket connected', { chain: chainName });
        this.websockets.set(chainName, ws);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebsocketMessage(chainName, message);
        } catch (error) {
          this.logger.error('Error parsing websocket message', error, {
            chain: chainName
          });
        }
      });

      ws.on('error', (error) => {
        this.logger.error('Websocket error', error, { chain: chainName });
        this.metricsCollector?.recordError('websocket_error', chainName);
      });

      ws.on('close', () => {
        this.logger.warn('Websocket closed', { chain: chainName });
        this.websockets.delete(chainName);

        // Reconnect after delay if still running
        if (this.isRunning) {
          setTimeout(() => {
            this.setupWebsocket(chainName, config);
          }, 5000);
        }
      });

    } catch (error) {
      this.logger.error('Failed to setup websocket', error, { chain: chainName });
    }
  }

  /**
   * Handle websocket messages
   */
  private handleWebsocketMessage(chainName: string, message: any): void {
    // Implementation would depend on the specific websocket format for each chain
    this.logger.debug('Received websocket message', {
      chain: chainName,
      type: message.method || message.type
    });
  }

  /**
   * Start monitoring for a specific chain
   */
  private startChainMonitoring(chainName: string): void {
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        await this.monitorChainTransactions(chainName);
      } catch (error) {
        this.logger.error('Error monitoring chain transactions', error, {
          chain: chainName
        });
      }
    }, this.monitorIntervalMs);

    this.monitoringIntervals.set(chainName, interval);
  }

  /**
   * Monitor transactions for a specific chain
   */
  private async monitorChainTransactions(chainName: string): Promise<void> {
    const config = this.chains.get(chainName);
    const provider = this.providers.get(chainName);
    const circuitBreaker = this.circuitBreakers.get(chainName);

    if (!config || !provider || !circuitBreaker) {
      return;
    }

    try {
      // Get pending transactions for this chain
      const pendingTransactions = await this.transactionRepo.findPendingTransactions(chainName);

      if (pendingTransactions.length === 0) {
        return;
      }

      this.logger.debug('Monitoring transactions', {
        chain: chainName,
        count: pendingTransactions.length
      });

      // Check each transaction
      for (const transaction of pendingTransactions) {
        try {
          await circuitBreaker.execute(
            () => this.checkTransaction(chainName, transaction.transactionHash, config, provider),
            `check_transaction_${chainName}`
          );
        } catch (error) {
          this.logger.error('Error checking transaction', error, {
            chain: chainName,
            transactionHash: transaction.transactionHash
          });
        }
      }

    } catch (error) {
      this.metricsCollector?.recordError('chain_monitoring', chainName);
      this.logger.error('Chain monitoring error', error, { chain: chainName });
    }
  }

  /**
   * Check individual transaction status
   */
  private async checkTransaction(
    chainName: string,
    transactionHash: string,
    config: BlockchainConfig,
    provider: any
  ): Promise<void> {
    const timer = this.metricsCollector?.createTimer();

    try {
      let receipt: any = null;
      let confirmations = 0;
      let blockNumber: number | undefined;
      let blockHash: string | undefined;

      switch (config.type) {
        case 'solana':
          // Solana transaction checking
          receipt = await provider.getSignatureStatus(transactionHash, {
            searchTransactionHistory: true
          });

          if (receipt?.value) {
            confirmations = receipt.value.confirmations || 0;
            if (receipt.value.slot) {
              blockNumber = receipt.value.slot;
            }
          }
          break;

        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'bsc':
          // EVM transaction checking
          receipt = await provider.getTransactionReceipt(transactionHash);

          if (receipt) {
            const currentBlock = await provider.getBlockNumber();
            confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);
            blockNumber = receipt.blockNumber;
            blockHash = receipt.blockHash;
          }
          break;
      }

      // Update transaction based on findings
      if (receipt) {
        await this.updateTransaction(chainName, transactionHash, {
          confirmations,
          blockNumber,
          blockHash,
          status: confirmations >= config.confirmations ? 'confirmed' : 'pending'
        });
      } else {
        // Check if transaction might be dropped (older than expected)
        const transaction = await this.transactionRepo.findOne({ transactionHash });
        if (transaction) {
          const ageMinutes = (Date.now() - transaction.createdAt.getTime()) / (1000 * 60);
          if (ageMinutes > 60) { // 1 hour
            await this.transactionRepo.markAsDropped(transactionHash);
            this.emit('transactionDropped', { chainName, transactionHash });
          }
        }
      }

      this.metricsCollector?.recordBlockchainOperation(
        chainName,
        'transaction_check',
        true,
        timer?.() || 0
      );

    } catch (error) {
      this.metricsCollector?.recordBlockchainOperation(
        chainName,
        'transaction_check',
        false,
        timer?.() || 0
      );

      const errorMessage = String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
        // Transaction might be dropped
        await this.transactionRepo.markAsDropped(transactionHash);
        this.emit('transactionDropped', { chainName, transactionHash });
      } else {
        throw error;
      }
    }
  }

  /**
   * Update transaction status
   */
  private async updateTransaction(
    chainName: string,
    transactionHash: string,
    update: {
      confirmations: number;
      blockNumber?: number;
      blockHash?: string;
      status: 'pending' | 'confirmed' | 'failed';
    }
  ): Promise<void> {
    try {
      const transaction = await this.transactionRepo.updateConfirmations(
        transactionHash,
        update.confirmations,
        update.blockNumber,
        update.blockHash
      );

      if (transaction) {
        const updateEvent: TransactionUpdate = {
          transactionHash,
          chain: chainName,
          status: update.status,
          confirmations: update.confirmations,
          blockNumber: update.blockNumber,
          blockHash: update.blockHash
        };

        this.emit('transactionUpdate', updateEvent);

        // If confirmed, update deployment status
        if (update.status === 'confirmed' && transaction.deploymentId) {
          await this.updateDeploymentStatus(transaction.deploymentId, chainName, {
            transactionHash,
            status: 'completed',
            blockNumber: update.blockNumber
          });
        }

        this.logger.debug('Transaction updated', {
          transactionHash,
          chain: chainName,
          status: update.status,
          confirmations: update.confirmations
        });
      }

    } catch (error) {
      this.logger.error('Failed to update transaction', error, {
        transactionHash,
        chain: chainName
      });
    }
  }

  /**
   * Update deployment status when transaction is confirmed
   */
  private async updateDeploymentStatus(
    deploymentId: string,
    chainName: string,
    data: {
      transactionHash: string;
      status: 'completed' | 'failed';
      blockNumber?: number;
      contractAddress?: string;
      error?: string;
    }
  ): Promise<void> {
    try {
      await this.deploymentRepo.updateChainStatus(
        deploymentId,
        chainName,
        data.status,
        data
      );

      this.emit('deploymentUpdate', {
        deploymentId,
        chain: chainName,
        status: data.status,
        transactionHash: data.transactionHash
      });

      this.logger.info('Deployment status updated', {
        deploymentId,
        chain: chainName,
        status: data.status
      });

    } catch (error) {
      this.logger.error('Failed to update deployment status', error, {
        deploymentId,
        chain: chainName
      });
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    return {
      chainsConfigured: this.chains.size,
      providersActive: this.providers.size,
      websocketsActive: this.websockets.size,
      isRunning: this.isRunning,
      chains: Array.from(this.chains.keys()),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([chain, cb]) => ({
        chain,
        ...cb.getStats()
      }))
    };
  }
}