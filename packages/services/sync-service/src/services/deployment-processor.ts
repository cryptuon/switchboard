/**
 * ChainSync Deployment Processor
 *
 * Processes cross-chain deployments and coordinates with blockchain networks
 */

import { EventEmitter } from 'events';
import { Connection, Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';

import {
  Logger,
  ServiceError,
  ErrorCode,
  RetryManager,
  MetricsCollector,
  MessageBus,
  Message
} from '@chainsync/services-shared';

import { DeploymentRepository } from '../repositories/deployment-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { IDeployment } from '../models/deployment';

export interface DeploymentRequest {
  deploymentId: string;
  contractCode: string;
  chains: string[];
  initiatedBy: string;
  config?: {
    gasLimit?: number;
    gasPrice?: string;
    constructorArgs?: any[];
  };
}

export interface DeploymentResult {
  deploymentId: string;
  chain: string;
  success: boolean;
  transactionHash?: string;
  contractAddress?: string;
  error?: string;
  gasUsed?: number;
}

export class DeploymentProcessor extends EventEmitter {
  private readonly logger: Logger;
  // private readonly _retryManager: RetryManager; // Unused currently
  private readonly metricsCollector?: MetricsCollector;
  private readonly messageBus?: MessageBus;
  private readonly deploymentRepo: DeploymentRepository;
  private readonly transactionRepo: TransactionRepository;

  private providers: Map<string, any> = new Map();
  private signers: Map<string, any> = new Map();
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  private readonly maxConcurrentDeployments: number = 5;
  private readonly processingIntervalMs: number = 5000;

  constructor(
    deploymentRepo: DeploymentRepository,
    transactionRepo: TransactionRepository,
    logger: Logger,
    _retryManager: RetryManager,
    metricsCollector?: MetricsCollector,
    messageBus?: MessageBus
  ) {
    super();
    this.deploymentRepo = deploymentRepo;
    this.transactionRepo = transactionRepo;
    this.logger = logger;
    // this._retryManager = retryManager;
    this.metricsCollector = metricsCollector;
    this.messageBus = messageBus;

    // Subscribe to deployment messages
    if (this.messageBus) {
      this.messageBus.subscribe('deployment.request', this.handleDeploymentMessage.bind(this));
    }
  }

  /**
   * Configure blockchain provider and signer
   */
  configureChain(chainName: string, config: {
    rpcUrl: string;
    privateKey?: string;
    type: 'ethereum' | 'solana' | 'polygon' | 'arbitrum' | 'bsc';
    chainId?: number;
  }): void {
    try {
      let provider: any;
      let signer: any;

      switch (config.type) {
        case 'solana':
          provider = new Connection(config.rpcUrl, 'confirmed');
          if (config.privateKey) {
            // Convert private key to Keypair
            const secretKey = Buffer.from(config.privateKey, 'hex');
            signer = Keypair.fromSecretKey(secretKey);
          }
          break;

        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'bsc':
          provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
          if (config.privateKey) {
            signer = new ethers.Wallet(config.privateKey, provider);
          }
          break;

        default:
          throw new Error(`Unsupported chain type: ${config.type}`);
      }

      this.providers.set(chainName, { provider, type: config.type });
      if (signer) {
        this.signers.set(chainName, signer);
      }

      this.logger.info('Chain configured for deployment', {
        chain: chainName,
        type: config.type,
        hasSigner: !!signer
      });

    } catch (error) {
      this.logger.error('Failed to configure chain', error, { chain: chainName });
      throw new ServiceError(
        `Failed to configure chain ${chainName}: ${String(error)}`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { chain: chainName, originalError: error },
        'deployment-processor'
      );
    }
  }

  /**
   * Start processing deployments
   */
  start(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.info('Starting deployment processor');

    this.processingInterval = setInterval(() => {
      this.processQueuedDeployments().catch(error => {
        this.logger.error('Error processing deployments', error);
      });
    }, this.processingIntervalMs);

    this.emit('started');
  }

  /**
   * Stop processing deployments
   */
  stop(): void {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    this.logger.info('Stopping deployment processor');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Queue a new deployment
   */
  async queueDeployment(request: DeploymentRequest): Promise<IDeployment> {
    this.logger.info('Queueing deployment', {
      deploymentId: request.deploymentId,
      chains: request.chains,
      initiatedBy: request.initiatedBy
    });

    try {
      const deployment = await this.deploymentRepo.createDeployment({
        deploymentId: request.deploymentId,
        contractCode: request.contractCode,
        chains: request.chains,
        initiatedBy: request.initiatedBy,
        config: request.config || {}
      });

      this.emit('deploymentQueued', deployment);

      // Send message if message bus is available
      if (this.messageBus) {
        await this.messageBus.publish({
          type: 'deployment.queued',
          source: 'deployment-processor',
          payload: {
            deploymentId: request.deploymentId,
            chains: request.chains
          }
        });
      }

      return deployment;

    } catch (error) {
      this.logger.error('Failed to queue deployment', error, {
        deploymentId: request.deploymentId
      });
      throw error;
    }
  }

  /**
   * Process queued deployments
   */
  private async processQueuedDeployments(): Promise<void> {
    try {
      const pendingDeployments = await this.deploymentRepo.findPendingForProcessing(
        this.maxConcurrentDeployments
      );

      if (pendingDeployments.length === 0) {
        return;
      }

      this.logger.debug('Processing deployments', {
        count: pendingDeployments.length
      });

      // Process deployments concurrently
      const processingPromises = pendingDeployments.map(deployment =>
        this.processDeployment(deployment).catch(error => {
          this.logger.error('Deployment processing failed', error, {
            deploymentId: deployment.deploymentId
          });
        })
      );

      await Promise.allSettled(processingPromises);

    } catch (error) {
      this.logger.error('Error processing deployment queue', error);
    }
  }

  /**
   * Process a single deployment
   */
  private async processDeployment(deployment: IDeployment): Promise<void> {
    this.logger.info('Processing deployment', {
      deploymentId: deployment.deploymentId,
      chains: deployment.chains.length
    });

    const timer = this.metricsCollector?.createTimer();

    try {
      // Update deployment status to in_progress
      deployment.status = 'in_progress';
      await deployment.save();

      // Deploy to each chain
      const deploymentPromises = deployment.chains.map(async (chain) => {
        if (chain.status === 'pending') {
          await this.deployToChain(deployment, chain.name);
        }
      });

      await Promise.allSettled(deploymentPromises);

      this.metricsCollector?.recordDeployment(
        'success',
        deployment.chains.length,
        timer?.() || 0
      );

      this.emit('deploymentProcessed', deployment);

    } catch (error) {
      this.metricsCollector?.recordDeployment(
        'failed',
        deployment.chains.length,
        timer?.() || 0
      );

      this.logger.error('Deployment processing failed', error, {
        deploymentId: deployment.deploymentId
      });

      // Mark deployment as failed
      deployment.status = 'failed';
      await deployment.save();

      this.emit('deploymentFailed', { deployment, error });
    }
  }

  /**
   * Deploy contract to a specific chain
   */
  private async deployToChain(deployment: IDeployment, chainName: string): Promise<void> {
    const providerConfig = this.providers.get(chainName);
    const signer = this.signers.get(chainName);

    if (!providerConfig) {
      throw new ServiceError(
        `No provider configured for chain: ${chainName}`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { chain: chainName, deploymentId: deployment.deploymentId },
        'deployment-processor'
      );
    }

    if (!signer) {
      throw new ServiceError(
        `No signer configured for chain: ${chainName}`,
        ErrorCode.CONFIGURATION_ERROR,
        500,
        { chain: chainName, deploymentId: deployment.deploymentId },
        'deployment-processor'
      );
    }

    this.logger.info('Deploying to chain', {
      deploymentId: deployment.deploymentId,
      chain: chainName,
      type: providerConfig.type
    });

    const timer = this.metricsCollector?.createTimer();

    try {
      // Update chain status to deploying
      await this.deploymentRepo.updateChainStatus(
        deployment.deploymentId,
        chainName,
        'deploying'
      );

      let result: DeploymentResult;

      // Deploy based on chain type
      switch (providerConfig.type) {
        case 'solana':
          result = await this.deploySolanaContract(
            deployment,
            chainName,
            providerConfig.provider,
            signer
          );
          break;

        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'bsc':
          result = await this.deployEvmContract(
            deployment,
            chainName,
            providerConfig.provider,
            signer
          );
          break;

        default:
          throw new Error(`Unsupported chain type: ${providerConfig.type}`);
      }

      // Record transaction
      if (result.transactionHash) {
        await this.transactionRepo.createTransaction({
          transactionId: `${deployment.deploymentId}-${chainName}`,
          deploymentId: deployment.deploymentId,
          chain: chainName,
          transactionHash: result.transactionHash,
          requiredConfirmations: this.getRequiredConfirmations(chainName),
          metadata: {
            contractAddress: result.contractAddress,
            gasUsed: result.gasUsed
          }
        });
      }

      // Update deployment chain status
      await this.deploymentRepo.updateChainStatus(
        deployment.deploymentId,
        chainName,
        result.success ? 'completed' : 'failed',
        {
          transactionHash: result.transactionHash,
          contractAddress: result.contractAddress,
          error: result.error,
          gasUsed: result.gasUsed
        }
      );

      this.metricsCollector?.recordBlockchainOperation(
        chainName,
        'contract_deployment',
        result.success,
        timer?.() || 0
      );

      this.emit('chainDeploymentComplete', result);

    } catch (error) {
      this.metricsCollector?.recordBlockchainOperation(
        chainName,
        'contract_deployment',
        false,
        timer?.() || 0
      );

      // Update chain status to failed
      await this.deploymentRepo.updateChainStatus(
        deployment.deploymentId,
        chainName,
        'failed',
        { error: String(error) }
      );

      this.logger.error('Chain deployment failed', error, {
        deploymentId: deployment.deploymentId,
        chain: chainName
      });

      throw error;
    }
  }

  /**
   * Deploy contract to Solana
   */
  private async deploySolanaContract(
    deployment: IDeployment,
    chainName: string,
    _connection: Connection, // Unused in current implementation
    _signer: Keypair // Unused in current implementation
  ): Promise<DeploymentResult> {
    // Solana deployment implementation would go here
    // This is a simplified example

    const result: DeploymentResult = {
      deploymentId: deployment.deploymentId,
      chain: chainName,
      success: false,
      error: 'Solana deployment not implemented'
    };

    return result;
  }

  /**
   * Deploy contract to EVM chains
   */
  private async deployEvmContract(
    deployment: IDeployment,
    chainName: string,
    _provider: ethers.JsonRpcProvider, // Unused in current implementation
    _signer: ethers.Wallet // Unused in current implementation
  ): Promise<DeploymentResult> {
    try {
      // Create contract factory
      const factory = new ethers.ContractFactory(
        [], // ABI would be extracted from contractCode
        deployment.contractCode,
        _signer
      );

      // Deploy with configuration
      const contract = await factory.deploy(
        ...(deployment.config?.constructorArgs || []),
        {
          gasLimit: deployment.config?.gasLimit,
          gasPrice: deployment.config?.gasPrice
        }
      );

      // Wait for deployment transaction
      const deploymentTransaction = await contract.deploymentTransaction()?.wait();

      return {
        deploymentId: deployment.deploymentId,
        chain: chainName,
        success: true,
        transactionHash: deploymentTransaction?.hash,
        contractAddress: await contract.getAddress(),
        gasUsed: deploymentTransaction?.gasUsed ? Number(deploymentTransaction.gasUsed) : undefined
      };

    } catch (error) {
      return {
        deploymentId: deployment.deploymentId,
        chain: chainName,
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Get required confirmations for a chain
   */
  private getRequiredConfirmations(chainName: string): number {
    const confirmationMap: { [key: string]: number } = {
      ethereum: 2,
      polygon: 5,
      bsc: 3,
      arbitrum: 1,
      solana: 1
    };

    return confirmationMap[chainName] || 2;
  }

  /**
   * Handle deployment messages from message bus
   */
  private async handleDeploymentMessage(message: Message): Promise<void> {
    try {
      const request = message.payload as DeploymentRequest;
      await this.queueDeployment(request);

      if (this.messageBus && message.correlationId) {
        await this.messageBus.sendResponse(message, {
          success: true,
          deploymentId: request.deploymentId
        });
      }

    } catch (error) {
      this.logger.error('Failed to handle deployment message', error);

      if (this.messageBus && message.correlationId) {
        await this.messageBus.sendResponse(message, {
          success: false,
          error: String(error)
        });
      }
    }
  }

  /**
   * Get processor statistics
   */
  getStats() {
    return {
      isProcessing: this.isProcessing,
      configuredChains: this.providers.size,
      chainsWithSigners: this.signers.size,
      maxConcurrentDeployments: this.maxConcurrentDeployments,
      processingIntervalMs: this.processingIntervalMs
    };
  }
}