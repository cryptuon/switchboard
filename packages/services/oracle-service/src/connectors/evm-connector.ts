/**
 * EVM-Compatible Chain Connector with Real-time Streaming
 *
 * Generic connector that works with all EVM-compatible chains
 * (Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, etc.)
 *
 * Features real-time WebSocket subscriptions for sub-400ms latency
 */

import {
  BaseConnector,
  ChainConnectorConfig,
  BlockData,
  TransactionData,
  ChainStateData,
  EventData,
  BlockStreamCallback,
  TransactionStreamCallback,
  EventStreamCallback,
  StateChangeCallback
} from './base-connector';
import { ethers } from 'ethers';

export class EVMConnector extends BaseConnector {
  private provider: ethers.JsonRpcProvider | null = null;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private isConnected: boolean = false;
  private blockSubscriptions = new Map<string, BlockStreamCallback>();
  private txSubscriptions = new Map<string, TransactionStreamCallback>();
  private eventSubscriptions = new Map<string, EventStreamCallback>();
  private stateChangeSubscriptions = new Map<string, StateChangeCallback>();

  constructor(config: ChainConnectorConfig) {
    super(config);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      console.log(`[${this.config.chainName}] Connecting to EVM network...`);

      // Create HTTP provider for standard RPC calls
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

      // Create WebSocket provider for real-time subscriptions
      const wsUrl = this.convertToWebSocketUrl(this.config.rpcUrl);
      if (wsUrl) {
        this.wsProvider = new ethers.WebSocketProvider(wsUrl);

        // Set up WebSocket error handling
        const ws = this.wsProvider.websocket as any;
        ws.on('error', (error: any) => {
          console.error(`[${this.config.chainName}] WebSocket error:`, error);
        });

        ws.on('close', () => {
          console.warn(`[${this.config.chainName}] WebSocket connection closed, attempting reconnect...`);
          this.reconnectWebSocket();
        });
      }

      // Test connection
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new Error(`Chain ID mismatch: expected ${this.config.chainId}, got ${network.chainId}`);
      }

      this.isConnected = true;
      console.log(`[${this.config.chainName}] ✅ Connected successfully (Chain ID: ${network.chainId})`);

      if (this.wsProvider) {
        console.log(`[${this.config.chainName}] ✅ WebSocket streaming enabled`);
      }
    } catch (error: any) {
      this.handleError(error, 'connect');
    }
  }

  async disconnect(): Promise<void> {
    // Stop all streaming subscriptions
    await this.stopStreaming();

    // Close WebSocket connection
    if (this.wsProvider) {
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    // Close HTTP provider
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }

    this.isConnected = false;
    console.log(`[${this.config.chainName}] 🔌 Disconnected`);
  }

  async getLatestBlock(): Promise<BlockData> {
    this.ensureConnected();

    try {
      const block = await this.provider!.getBlock('latest');
      if (!block) {
        throw new Error('Latest block not found');
      }

      return {
        blockNumber: block.number,
        blockHash: block.hash!,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
        parentHash: block.parentHash,
        validator: block.miner || 'unknown'
      };
    } catch (error: any) {
      this.handleError(error, 'getLatestBlock');
    }
  }

  async getBlockByNumber(blockNumber: number): Promise<BlockData> {
    this.ensureConnected();

    try {
      const block = await this.provider!.getBlock(blockNumber);
      if (!block) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      return {
        blockNumber: block.number,
        blockHash: block.hash!,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
        parentHash: block.parentHash,
        validator: block.miner || 'unknown'
      };
    } catch (error: any) {
      this.handleError(error, 'getBlockByNumber');
    }
  }

  async getTransaction(txHash: string): Promise<TransactionData> {
    this.ensureConnected();

    try {
      const [tx, receipt] = await Promise.all([
        this.provider!.getTransaction(txHash),
        this.provider!.getTransactionReceipt(txHash)
      ]);

      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      return {
        txHash: tx.hash,
        fromAddress: tx.from!,
        toAddress: tx.to || '0x0000000000000000000000000000000000000000',
        value: ethers.formatEther(tx.value),
        gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : undefined,
        gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : undefined,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        blockNumber: tx.blockNumber || 0,
        transactionIndex: tx.index
      };
    } catch (error: any) {
      this.handleError(error, 'getTransaction');
    }
  }

  async getChainState(): Promise<ChainStateData> {
    this.ensureConnected();

    try {
      const latestBlock = await this.getLatestBlock();

      return {
        chainId: this.config.chainId,
        chainName: this.config.chainName,
        blockData: latestBlock,
        transactions: [], // Will be populated by streaming
        events: [], // Will be populated by streaming
        networkHealth: 'healthy',
        lastSyncedBlock: latestBlock.blockNumber
      };
    } catch (error: any) {
      this.handleError(error, 'getChainState');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Try to fetch latest block as a health check
      await this.getLatestBlock();
      return true;
    } catch (error: any) {
      console.warn(`[${this.config.chainName}] Health check failed:`, String(error));
      return false;
    }
  }

  // Real-time streaming implementations
  async subscribeToBlocks(callback: BlockStreamCallback): Promise<string> {
    if (!this.wsProvider) {
      throw new Error(`WebSocket not available for ${this.config.chainName}. Real-time streaming disabled.`);
    }

    const __subscriptionId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.wsProvider.on('block', async (blockNumber: number) => {
        try {
          const blockData = await this.getBlockByNumber(blockNumber);
          await callback(blockData);
        } catch (error: any) {
          console.error(`[${this.config.chainName}] Error processing block ${blockNumber}:`, error);
        }
      });

      this.blockSubscriptions.set(__subscriptionId, callback);
      this.addSubscription(__subscriptionId);

      console.log(`[${this.config.chainName}] ✅ Subscribed to real-time blocks (${__subscriptionId})`);
      return __subscriptionId;
    } catch (error: any) {
      this.handleError(error, 'subscribeToBlocks');
    }
  }

  async subscribeToTransactions(callback: TransactionStreamCallback): Promise<string> {
    if (!this.wsProvider) {
      throw new Error(`WebSocket not available for ${this.config.chainName}. Real-time streaming disabled.`);
    }

    const __subscriptionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Subscribe to pending transactions
      this.wsProvider.on('pending', async (txHash: string) => {
        try {
          const txData = await this.getTransaction(txHash);
          await callback(txData);
        } catch (error: any) {
          // Ignore errors for pending transactions as they might not be available yet
        }
      });

      this.txSubscriptions.set(__subscriptionId, callback);
      this.addSubscription(__subscriptionId);

      console.log(`[${this.config.chainName}] ✅ Subscribed to real-time transactions (${__subscriptionId})`);
      return __subscriptionId;
    } catch (error: any) {
      this.handleError(error, 'subscribeToTransactions');
    }
  }

  async subscribeToEvents(callback: EventStreamCallback, __contractAddresses?: string[]): Promise<string> {
    if (!this.wsProvider) {
      throw new Error(`WebSocket not available for ${this.config.chainName}. Real-time streaming disabled.`);
    }

    const __subscriptionId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create filter for events
      const filter: any = __contractAddresses?.length
        ? { address: __contractAddresses }
        : {}; // Listen to all events if no specific contracts

      this.wsProvider.on(filter, async (log: any) => {
        try {
          const eventData: EventData = {
            eventId: `${log.transactionHash}_${log.logIndex}`,
            contractAddress: log.address,
            eventName: 'Unknown', // Would need ABI to decode
            eventSignature: log.topics[0] || '',
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
            timestamp: Date.now(), // Would get from block
            data: log.data ? { raw: log.data } : {},
            topics: log.topics || []
          };

          await callback(eventData);
        } catch (error: any) {
          console.error(`[${this.config.chainName}] Error processing event:`, error);
        }
      });

      this.eventSubscriptions.set(__subscriptionId, callback);
      this.addSubscription(__subscriptionId);

      console.log(`[${this.config.chainName}] ✅ Subscribed to real-time events (${__subscriptionId})`);
      return __subscriptionId;
    } catch (error: any) {
      this.handleError(error, 'subscribeToEvents');
    }
  }

  async subscribeToStateChanges(callback: StateChangeCallback): Promise<string> {
    const __subscriptionId = `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Subscribe to blocks and aggregate state changes
      const blockSubId = await this.subscribeToBlocks(async (blockData) => {
        try {
          const stateChange: ChainStateData = {
            chainId: this.config.chainId,
            chainName: this.config.chainName,
            blockData,
            transactions: [], // Would be populated by block's transactions
            events: [], // Would be populated by block's events
            networkHealth: 'healthy',
            lastSyncedBlock: blockData.blockNumber
          };

          await callback(stateChange);
        } catch (error: any) {
          console.error(`[${this.config.chainName}] Error processing state change:`, error);
        }
      });

      this.stateChangeSubscriptions.set(__subscriptionId, callback);
      this.addSubscription(__subscriptionId);

      console.log(`[${this.config.chainName}] ✅ Subscribed to real-time state changes (${__subscriptionId})`);
      return __subscriptionId;
    } catch (error: any) {
      this.handleError(error, 'subscribeToStateChanges');
    }
  }

  async unsubscribe(___subscriptionId: string): Promise<void> {
    try {
      // Remove from appropriate subscription map
      this.blockSubscriptions.delete(___subscriptionId);
      this.txSubscriptions.delete(___subscriptionId);
      this.eventSubscriptions.delete(___subscriptionId);
      this.stateChangeSubscriptions.delete(___subscriptionId);

      this.removeSubscription(___subscriptionId);

      console.log(`[${this.config.chainName}] ✅ Unsubscribed (${___subscriptionId})`);
    } catch (error: any) {
      console.warn(`[${this.config.chainName}] Failed to unsubscribe ${___subscriptionId}:`, error);
    }
  }

  // WebSocket utility methods
  private convertToWebSocketUrl(httpUrl: string): string | null {
    try {
      if (httpUrl.includes('wss://')) {
        return httpUrl;
      }

      // Convert common HTTP RPC URLs to WebSocket
      if (httpUrl.includes('infura.io')) {
        return httpUrl.replace('https://', 'wss://').replace('/v3/', '/ws/v3/');
      }
      if (httpUrl.includes('alchemy.com')) {
        return httpUrl.replace('https://', 'wss://').replace('/v2/', '/v2/');
      }
      if (httpUrl.includes('quicknode.com')) {
        return httpUrl.replace('https://', 'wss://');
      }

      console.warn(`[${this.config.chainName}] Could not convert ${httpUrl} to WebSocket URL. Streaming disabled.`);
      return null;
    } catch (error: any) {
      console.warn(`[${this.config.chainName}] WebSocket URL conversion failed:`, error);
      return null;
    }
  }

  private async reconnectWebSocket(): Promise<void> {
    try {
      console.log(`[${this.config.chainName}] Attempting WebSocket reconnection...`);

      if (this.wsProvider) {
        await this.wsProvider.destroy();
      }

      const wsUrl = this.convertToWebSocketUrl(this.config.rpcUrl);
      if (wsUrl) {
        this.wsProvider = new ethers.WebSocketProvider(wsUrl);
        console.log(`[${this.config.chainName}] ✅ WebSocket reconnected`);
      }
    } catch (error: any) {
      console.error(`[${this.config.chainName}] WebSocket reconnection failed:`, error);
      // Will retry on next event
    }
  }

  // Helper methods
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error(`Not connected to ${this.config.chainName}`);
    }
  }

  private generateMockHash(): string {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private getNetworkSpecificValidator(): string {
    // Different networks have different validator/miner formats
    switch (this.config.chainName.toLowerCase()) {
      case 'ethereum':
        return `0x${this.generateMockHash().substring(0, 40)}`; // Miner address
      case 'polygon':
        return `0x${this.generateMockHash().substring(0, 40)}`; // Validator address
      case 'bsc':
        return `0x${this.generateMockHash().substring(0, 40)}`; // Validator address
      default:
        return `0x${this.generateMockHash().substring(0, 40)}`;
    }
  }

  private getNetworkSpecificGasPrice(): string {
    // Different networks have different typical gas prices
    const gasMultiplier = this.getGasPriceMultiplier();
    const baseGasPrice = Math.random() * 50 * gasMultiplier;
    return baseGasPrice.toFixed(9);
  }

  private getGasPriceMultiplier(): number {
    switch (this.config.chainName.toLowerCase()) {
      case 'ethereum': return 20; // Higher gas prices
      case 'polygon': return 0.1; // Very low gas prices
      case 'arbitrum': return 1; // Low gas prices
      case 'optimism': return 1; // Low gas prices
      case 'bsc': return 0.2; // Low gas prices
      case 'avalanche': return 0.5; // Medium gas prices
      case 'fantom': return 0.1; // Very low gas prices
      default: return 1;
    }
  }
}