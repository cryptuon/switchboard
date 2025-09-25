/**
 * Base Connector Interface for All Blockchain Networks
 *
 * Provides a unified interface that all network connectors must implement
 */

export interface ChainConnectorConfig {
  rpcUrl: string;
  chainId: number;
  networkType: 'evm' | 'near' | 'cosmos' | 'move' | 'wasm' | 'custom';
  chainName: string;
}

export interface BlockData {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  transactionCount: number;
  parentHash?: string;
  validator?: string;
}

export interface TransactionData {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  gasUsed?: number;
  gasPrice?: string;
  status: 'success' | 'failed' | 'pending';
  blockNumber: number;
  transactionIndex?: number;
}

export interface EventData {
  eventId: string;
  contractAddress: string;
  eventName: string;
  eventSignature: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp: number;
  data: Record<string, any>;
  topics: string[];
}

export interface ChainStateData {
  chainId: number;
  chainName: string;
  blockData: BlockData;
  transactions: TransactionData[];
  events: EventData[];
  networkHealth: 'healthy' | 'degraded' | 'offline';
  lastSyncedBlock: number;
}

export type BlockStreamCallback = (block: BlockData) => Promise<void>;
export type TransactionStreamCallback = (transaction: TransactionData) => Promise<void>;
export type EventStreamCallback = (event: EventData) => Promise<void>;
export type StateChangeCallback = (stateChange: ChainStateData) => Promise<void>;

export abstract class BaseConnector {
  protected config: ChainConnectorConfig;
  protected isStreaming: boolean = false;
  protected streamingSubscriptions: Set<string> = new Set();

  constructor(config: ChainConnectorConfig) {
    this.config = config;
  }

  // Abstract methods that all connectors must implement
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getLatestBlock(): Promise<BlockData>;
  abstract getBlockByNumber(blockNumber: number): Promise<BlockData>;
  abstract getTransaction(txHash: string): Promise<TransactionData>;
  abstract getChainState(): Promise<ChainStateData>;
  abstract isHealthy(): Promise<boolean>;

  // Real-time streaming methods - must be implemented by connectors
  abstract subscribeToBlocks(callback: BlockStreamCallback): Promise<string>;
  abstract subscribeToTransactions(callback: TransactionStreamCallback): Promise<string>;
  abstract subscribeToEvents(callback: EventStreamCallback, _contractAddresses?: string[]): Promise<string>;
  abstract unsubscribe(_subscriptionId: string): Promise<void>;

  // Combined state change subscription
  abstract subscribeToStateChanges(callback: StateChangeCallback): Promise<string>;

  // Streaming management methods
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn(`[${this.config.chainName}] Already streaming`);
      return;
    }
    this.isStreaming = true;
    console.log(`[${this.config.chainName}] ✅ Started real-time streaming`);
  }

  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    // Unsubscribe from all active subscriptions
    const unsubscribePromises = Array.from(this.streamingSubscriptions).map(
      subId => this.unsubscribe(subId).catch(err =>
        console.warn(`Failed to unsubscribe ${subId}:`, err)
      )
    );

    await Promise.allSettled(unsubscribePromises);
    this.streamingSubscriptions.clear();
    this.isStreaming = false;
    console.log(`[${this.config.chainName}] ⏹️ Stopped streaming`);
  }

  getStreamingStatus(): {
    isStreaming: boolean;
    activeSubscriptions: number;
    subscriptionIds: string[];
  } {
    return {
      isStreaming: this.isStreaming,
      activeSubscriptions: this.streamingSubscriptions.size,
      subscriptionIds: Array.from(this.streamingSubscriptions)
    };
  }

  protected addSubscription(_subscriptionId: string): void {
    this.streamingSubscriptions.add(_subscriptionId);
  }

  protected removeSubscription(_subscriptionId: string): void {
    this.streamingSubscriptions.delete(_subscriptionId);
  }

  // Common utility methods
  getChainId(): number {
    return this.config.chainId;
  }

  getChainName(): string {
    return this.config.chainName;
  }

  getNetworkType(): string {
    return this.config.networkType;
  }

  getRpcUrl(): string {
    return this.config.rpcUrl;
  }

  // Validation helpers
  protected validateConfig(): void {
    if (!this.config.rpcUrl) {
      throw new Error(`RPC URL is required for ${this.config.chainName}`);
    }
    if (!this.config.chainId) {
      throw new Error(`Chain ID is required for ${this.config.chainName}`);
    }
  }

  // Network-agnostic utility methods
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected handleError(error: any, context: string): never {
    console.error(`[${this.config.chainName}] Error in ${context}:`, error);
    throw new Error(`${this.config.chainName} connector error: ${String(error) || error}`);
  }
}