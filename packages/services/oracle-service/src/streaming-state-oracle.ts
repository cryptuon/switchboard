/**
 * Switchboard Streaming State Oracle
 *
 * Real-time cross-chain state verification with sub-400ms latency
 * Replaces polling-based approach with WebSocket event streams
 */

import { EventEmitter } from 'events';
import { Connection } from '@solana/web3.js';
import { ConnectorFactory } from './connector-factory';
import {
  BaseConnector,
  ChainStateData,
  BlockData,
  EventData
} from './connectors/base-connector';
import { SolanaIntegration } from './solana-integration';

interface StreamingOracleConfig {
  solanaRpcUrl: string;
  chains: { [chainName: string]: string }; // chainName -> rpcUrl mapping
  streamingEnabled: boolean;
  batchProcessingSize: number;
  coordinationLatencyTarget: number; // Target ms for coordination
}

interface StreamMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  averageLatency: number;
  coordinationTime: number;
  healthyStreams: number;
  totalStreams: number;
}

export class StreamingStateOracle extends EventEmitter {
  private config: StreamingOracleConfig;
  private solanaConnection: Connection;
  private solanaIntegration: SolanaIntegration | null = null;
  private connectors: { [chainName: string]: BaseConnector };
  private isStreaming: boolean = false;
  private streamMetrics: StreamMetrics;
  private eventBuffer: Map<string, ChainStateData[]> = new Map();
  private coordinationQueue: ChainStateData[] = [];
  private lastProcessedTime: number = Date.now();

  constructor(config: StreamingOracleConfig) {
    super();
    this.config = {
      ...config,
      streamingEnabled: config.streamingEnabled ?? true,
      batchProcessingSize: config.batchProcessingSize ?? 100,
      coordinationLatencyTarget: config.coordinationLatencyTarget ?? 400
    };

    this.solanaConnection = new Connection(config.solanaRpcUrl);
    this.connectors = {};
    this.streamMetrics = {
      totalEvents: 0,
      eventsPerSecond: 0,
      averageLatency: 0,
      coordinationTime: 0,
      healthyStreams: 0,
      totalStreams: 0
    };

    // Initialize connectors for all configured chains
    this.initializeConnectors();

    // Initialize Solana integration
    this.initializeSolanaIntegration();
  }

  /**
   * Initialize Solana program integration
   */
  private async initializeSolanaIntegration(): Promise<void> {
    try {
      this.solanaIntegration = await SolanaIntegration.createTestConnection(this.config.solanaRpcUrl);
      console.log('✅ Solana coordination layer initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Solana integration:', error);
    }
  }

  /**
   * Initialize connectors for all configured chains
   */
  private initializeConnectors(): void {
    console.log('🔗 Initializing streaming connectors...');

    this.connectors = ConnectorFactory.createMultipleConnectors(this.config.chains);

    const supportedChains = Object.keys(this.connectors);
    console.log(`✅ Initialized ${supportedChains.length} streaming connectors: ${supportedChains.join(', ')}`);
  }

  /**
   * Connect to all chains and start real-time streaming
   */
  async startRealTimeStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn('⚠️ Streaming already active');
      return;
    }

    console.log('🚀 Starting real-time cross-chain streaming...');

    // Connect to all chains first
    await this.connectToAllChains();

    // Start streaming from each chain
    const streamingPromises = Object.entries(this.connectors).map(async ([chainName, connector]) => {
      try {
        await this.setupChainStreaming(chainName, connector);
        console.log(`✅ Real-time streaming active for ${chainName}`);
      } catch (error) {
        console.error(`❌ Failed to setup streaming for ${chainName}:`, error);
      }
    });

    await Promise.allSettled(streamingPromises);

    // Start coordination processing loop
    this.startCoordinationLoop();

    this.isStreaming = true;
    this.updateStreamMetrics();

    console.log(`🌊 Real-time streaming active across ${Object.keys(this.connectors).length} chains`);
  }

  /**
   * Setup real-time streaming for a specific chain
   */
  private async setupChainStreaming(chainName: string, connector: BaseConnector): Promise<void> {
    // Start streaming for this connector
    await connector.startStreaming();

    // Subscribe to state changes with immediate coordination
    await connector.subscribeToStateChanges(async (stateChange: ChainStateData) => {
      const startTime = Date.now();

      try {
        // Buffer state change for batch processing
        this.bufferStateChange(chainName, stateChange);

        // Process immediately if target latency requires it
        if (this.shouldProcessImmediately()) {
          await this.processCoordinationQueue();
        }

        // Update metrics
        const latency = Date.now() - startTime;
        this.updateLatencyMetrics(latency);

        console.log(`⚡ ${chainName} state change processed in ${latency}ms (Block: ${stateChange.blockData.blockNumber})`);
      } catch (error) {
        console.error(`❌ Error coordinating ${chainName} state change:`, error);
      }
    });

    // Subscribe to individual events for granular tracking
    await connector.subscribeToEvents(async (event: EventData) => {
      this.streamMetrics.totalEvents++;
      console.log(`📡 ${chainName} event: ${event.eventName} (${event.contractAddress})`);
    });

    // Subscribe to blocks for state verification
    await connector.subscribeToBlocks(async (block: BlockData) => {
      console.log(`🧱 ${chainName} new block: ${block.blockNumber} (${block.transactionCount} txs)`);
    });
  }

  /**
   * Buffer state changes for efficient batch processing
   */
  private bufferStateChange(chainName: string, stateChange: ChainStateData): void {
    if (!this.eventBuffer.has(chainName)) {
      this.eventBuffer.set(chainName, []);
    }

    const chainBuffer = this.eventBuffer.get(chainName)!;
    chainBuffer.push(stateChange);

    // Add to coordination queue
    this.coordinationQueue.push(stateChange);

    // Trim buffer if too large
    if (chainBuffer.length > this.config.batchProcessingSize) {
      chainBuffer.shift(); // Remove oldest
    }
  }

  /**
   * Determine if we should process immediately vs. wait for batch
   */
  private shouldProcessImmediately(): boolean {
    const timeSinceLastProcess = Date.now() - this.lastProcessedTime;

    return (
      this.coordinationQueue.length >= this.config.batchProcessingSize ||
      timeSinceLastProcess >= this.config.coordinationLatencyTarget ||
      this.coordinationQueue.length > 0 && timeSinceLastProcess >= 100 // Process at least every 100ms
    );
  }

  /**
   * Process the coordination queue with Solana
   */
  private async processCoordinationQueue(): Promise<void> {
    if (this.coordinationQueue.length === 0) return;

    const startTime = Date.now();
    const statesToCoordinate = this.coordinationQueue.splice(0, this.config.batchProcessingSize);

    try {
      if (this.solanaIntegration) {
        // Use optimized real-time coordination
        if (statesToCoordinate.length === 1) {
          // Single state - use immediate coordination
          await this.solanaIntegration.coordinateImmediateState(statesToCoordinate[0]);
        } else {
          // Multiple states - use batch coordination with parallel processing
          const coordinationPromises = statesToCoordinate.map(state =>
            this.solanaIntegration!.coordinateImmediateState(state)
          );

          await Promise.allSettled(coordinationPromises);
        }

        const coordinationTime = Date.now() - startTime;
        this.streamMetrics.coordinationTime = coordinationTime;

        const solanaMetrics = this.solanaIntegration.getCoordinationMetrics();

        console.log(`⚡ Real-time coordinated ${statesToCoordinate.length} states in ${coordinationTime}ms`);
        console.log(`   Solana avg latency: ${solanaMetrics.averageLatency.toFixed(0)}ms (${solanaMetrics.performanceStatus})`);

        if (coordinationTime > this.config.coordinationLatencyTarget) {
          console.warn(`⚠️ Coordination latency exceeded target: ${coordinationTime}ms > ${this.config.coordinationLatencyTarget}ms`);
        }
      } else {
        // Fallback processing without Solana
        console.log(`📝 Mock coordination for ${statesToCoordinate.length} states`);
      }

      this.lastProcessedTime = Date.now();
    } catch (error) {
      console.error('❌ Coordination processing failed:', error);

      // Re-add failed states to front of queue for retry
      this.coordinationQueue.unshift(...statesToCoordinate);
    }
  }

  /**
   * Start background coordination processing loop
   */
  private startCoordinationLoop(): void {
    setInterval(async () => {
      try {
        if (this.coordinationQueue.length > 0) {
          await this.processCoordinationQueue();
        }
        this.updateStreamMetrics();
      } catch (error) {
        console.error('❌ Coordination loop error:', error);
      }
    }, 50); // Run every 50ms for sub-400ms latency
  }

  /**
   * Update streaming metrics
   */
  private updateLatencyMetrics(latency: number): void {
    // Simple moving average for latency
    this.streamMetrics.averageLatency =
      (this.streamMetrics.averageLatency * 0.9) + (latency * 0.1);
  }

  private updateStreamMetrics(): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastProcessedTime;

    if (timeSinceLastUpdate > 0) {
      this.streamMetrics.eventsPerSecond =
        (this.streamMetrics.totalEvents / timeSinceLastUpdate) * 1000;
    }

    // Count healthy streams
    this.streamMetrics.healthyStreams = Object.values(this.connectors)
      .filter(connector => connector.getStreamingStatus().isStreaming).length;

    this.streamMetrics.totalStreams = Object.keys(this.connectors).length;
  }

  /**
   * Connect to all configured blockchain networks
   */
  async connectToAllChains(): Promise<void> {
    console.log('🌐 Connecting to all blockchain networks...');

    const connectionPromises = Object.entries(this.connectors).map(async ([chainName, connector]) => {
      try {
        await connector.connect();
        console.log(`✅ Connected to ${chainName}`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${chainName}:`, error);
      }
    });

    await Promise.allSettled(connectionPromises);
  }

  /**
   * Stop all streaming and disconnect
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) return;

    console.log('🛑 Stopping real-time streaming...');

    const stopPromises = Object.entries(this.connectors).map(async ([chainName, connector]) => {
      try {
        await connector.stopStreaming();
        await connector.disconnect();
        console.log(`✅ Stopped streaming for ${chainName}`);
      } catch (error) {
        console.error(`❌ Error stopping ${chainName}:`, error);
      }
    });

    await Promise.allSettled(stopPromises);

    this.isStreaming = false;
    console.log('⏹️ Streaming stopped');
  }

  /**
   * Get real-time streaming metrics
   */
  getStreamingMetrics(): StreamMetrics & {
    coordinationQueueSize: number;
    bufferSizes: { [chainName: string]: number };
    latencyStatus: 'optimal' | 'acceptable' | 'degraded';
  } {
    const latencyStatus =
      this.streamMetrics.averageLatency <= this.config.coordinationLatencyTarget
        ? 'optimal'
        : this.streamMetrics.averageLatency <= this.config.coordinationLatencyTarget * 1.5
        ? 'acceptable'
        : 'degraded';

    const bufferSizes: { [chainName: string]: number } = {};
    for (const [chainName, buffer] of this.eventBuffer.entries()) {
      bufferSizes[chainName] = buffer.length;
    }

    return {
      ...this.streamMetrics,
      coordinationQueueSize: this.coordinationQueue.length,
      bufferSizes,
      latencyStatus
    };
  }

  /**
   * Get comprehensive system status including streaming performance
   */
  async getSystemStatus(): Promise<{
    totalChains: number;
    streamingChains: number;
    connectedChains: string[];
    streamingMetrics: ReturnType<StreamingStateOracle['getStreamingMetrics']>;
    lastCoordinationTime: string;
    solanaConnectionStatus: boolean;
    performanceStatus: 'optimal' | 'degraded' | 'critical';
  }> {
    const streamingMetrics = this.getStreamingMetrics();
    const connectedChains = Object.keys(this.connectors);

    // Test Solana connection
    let solanaConnectionStatus = false;
    try {
      await this.solanaConnection.getVersion();
      solanaConnectionStatus = true;
    } catch (error) {
      console.warn('Solana connection check failed:', error);
    }

    // Determine performance status
    let performanceStatus: 'optimal' | 'degraded' | 'critical' = 'optimal';
    if (streamingMetrics.latencyStatus === 'degraded') {
      performanceStatus = 'degraded';
    }
    if (streamingMetrics.healthyStreams < streamingMetrics.totalStreams * 0.5) {
      performanceStatus = 'critical';
    }

    return {
      totalChains: connectedChains.length,
      streamingChains: streamingMetrics.healthyStreams,
      connectedChains,
      streamingMetrics,
      lastCoordinationTime: new Date(this.lastProcessedTime).toISOString(),
      solanaConnectionStatus,
      performanceStatus
    };
  }

  /**
   * Add runtime support for a new chain
   */
  addChainSupport(chainName: string, rpcUrl: string): void {
    try {
      const connector = ConnectorFactory.createConnector(chainName, rpcUrl);
      this.connectors[chainName.toLowerCase()] = connector;
      this.config.chains[chainName.toLowerCase()] = rpcUrl;

      console.log(`✅ Added runtime support for ${chainName}`);

      // If streaming is active, start streaming for this new chain
      if (this.isStreaming) {
        this.setupChainStreaming(chainName.toLowerCase(), connector)
          .then(() => console.log(`✅ Started streaming for ${chainName}`))
          .catch(error => console.error(`❌ Failed to start streaming for ${chainName}:`, error));
      }
    } catch (error) {
      console.error(`❌ Failed to add support for ${chainName}:`, error);
      throw error;
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return Object.keys(this.config.chains);
  }

  /**
   * Process state change event
   */
  async processStateChange(stateChange: ChainStateData): Promise<void> {
    try {
      // Add to coordination queue for processing
      this.coordinationQueue.push(stateChange);

      // Emit state change event
      this.emit('stateChange', stateChange);

      // Update metrics
      this.streamMetrics.totalEvents++;

      console.log(`📊 Processed state change for ${stateChange.chainName} block ${stateChange.blockData.blockNumber}`);
    } catch (error) {
      console.error('❌ Failed to process state change:', error);
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): StreamingOracleConfig {
    return this.config;
  }
}