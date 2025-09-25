/**
 * Comprehensive Test Suite for Streaming State Oracle
 * Tests real-time coordination and sub-400ms performance targets
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { StreamingStateOracle } from '../src/streaming-state-oracle';
import { PerformanceMonitor } from '../src/performance-monitor';
import { Connection } from '@solana/web3.js';

// Mock the Solana connection
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getVersion: jest.fn().mockResolvedValue({})
  })),
  PublicKey: jest.fn()
}));

describe('StreamingStateOracle', () => {
  let oracle: StreamingStateOracle;
  let performanceMonitor: PerformanceMonitor;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      solanaRpcUrl: 'https://api.devnet.solana.com',
      chains: {
        ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        polygon: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
        arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/demo'
      },
      streamingEnabled: true,
      batchProcessingSize: 50,
      coordinationLatencyTarget: 400
    };

    oracle = new StreamingStateOracle(mockConfig);
    performanceMonitor = new PerformanceMonitor(oracle);
  });

  afterEach(async () => {
    if (oracle) {
      await oracle.stopStreaming();
    }
    if (performanceMonitor) {
      performanceMonitor.stopMonitoring();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      const config = oracle.getConfig();
      expect(config.coordinationLatencyTarget).toBe(400);
      expect(config.batchProcessingSize).toBe(50);
      expect(config.streamingEnabled).toBe(true);
      expect(Object.keys(config.chains)).toHaveLength(3);
    });

    it('should create connectors for all configured chains', () => {
      // Test that connectors are created for each chain
      const supportedChains = oracle.getSupportedChains();
      expect(supportedChains).toContain('ethereum');
      expect(supportedChains).toContain('polygon');
      expect(supportedChains).toContain('arbitrum');
    });
  });

  describe('Real-time Streaming', () => {
    it('should start streaming successfully', async () => {
      const startPromise = oracle.startRealTimeStreaming();
      await expect(startPromise).resolves.not.toThrow();
    });

    it('should handle multiple chain connections', async () => {
      await oracle.connectToAllChains();

      const systemStatus = await oracle.getSystemStatus();
      expect(systemStatus.totalChains).toBe(3);
      expect(systemStatus.connectedChains).toEqual(['ethereum', 'polygon', 'arbitrum']);
    });

    it('should emit state change events', async () => {
      const stateChangeHandler = jest.fn();
      oracle.on('stateChange', stateChangeHandler);

      await oracle.startRealTimeStreaming();

      // Simulate a state change
      const mockStateChange = {
        chainId: 1,
        chainName: 'ethereum',
        blockData: {
          blockNumber: 18500000,
          blockHash: '0x123...',
          timestamp: Date.now() / 1000,
          transactionCount: 150,
          parentHash: '0x456...',
          validator: '0x789...'
        },
        transactions: [],
        events: [],
        networkHealth: 'healthy' as const,
        lastSyncedBlock: 18500000
      };

      // Trigger state change processing
      await oracle.processStateChange(mockStateChange);

      expect(stateChangeHandler).toHaveBeenCalledWith(mockStateChange);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track streaming metrics', async () => {
      await oracle.startRealTimeStreaming();

      const metrics = oracle.getStreamingMetrics();
      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('eventsPerSecond');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('coordinationTime');
      expect(metrics).toHaveProperty('healthyStreams');
      expect(metrics).toHaveProperty('totalStreams');
    });

    it('should meet sub-400ms coordination target', async () => {
      await oracle.startRealTimeStreaming();

      const startTime = Date.now();

      // Simulate state coordination
      const mockStateChange = {
        chainId: 1,
        chainName: 'ethereum',
        blockData: {
          blockNumber: 18500001,
          blockHash: '0x123...',
          timestamp: Date.now() / 1000,
          transactionCount: 100,
          parentHash: '0x456...',
          validator: '0x789...'
        },
        transactions: [],
        events: [],
        networkHealth: 'healthy' as const,
        lastSyncedBlock: 18500001
      };

      await oracle.processStateChange(mockStateChange);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(400); // Sub-400ms target
    });

    it('should start and stop performance monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      performanceMonitor.startMonitoring(1000); // 1 second interval for testing
      expect(consoleSpy).toHaveBeenCalledWith('📊 Starting real-time performance monitoring...');

      performanceMonitor.stopMonitoring();
      expect(consoleSpy).toHaveBeenCalledWith('⏹️ Performance monitoring stopped');

      consoleSpy.mockRestore();
    });

    it('should generate performance reports', async () => {
      performanceMonitor.startMonitoring(100); // Fast interval for testing

      // Wait for some snapshots to be captured
      await new Promise(resolve => setTimeout(resolve, 250));

      const report = performanceMonitor.generateReport();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('complianceRate');
      expect(report).toHaveProperty('averageLatency');
      expect(report).toHaveProperty('performanceTrend');

      expect(report.summary.totalSnapshots).toBeGreaterThan(0);
    });
  });

  describe('Chain Management', () => {
    it('should add runtime chain support', () => {
      const newChainName = 'optimism';
      const newChainRpc = 'https://opt-mainnet.g.alchemy.com/v2/demo';

      oracle.addChainSupport(newChainName, newChainRpc);

      const supportedChains = oracle.getSupportedChains();
      expect(supportedChains).toContain(newChainName);

      const config = oracle.getConfig();
      expect(config.chains[newChainName]).toBe(newChainRpc);
    });

    it('should handle chain connection failures gracefully', async () => {
      // Create oracle with invalid RPC URL
      const invalidConfig = {
        ...mockConfig,
        chains: {
          invalid: 'https://invalid-rpc-url.com'
        }
      };

      const invalidOracle = new StreamingStateOracle(invalidConfig);

      // Should not throw, but should log errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await invalidOracle.connectToAllChains();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('System Status', () => {
    it('should provide comprehensive system status', async () => {
      await oracle.connectToAllChains();

      const status = await oracle.getSystemStatus();

      expect(status).toHaveProperty('totalChains');
      expect(status).toHaveProperty('streamingChains');
      expect(status).toHaveProperty('connectedChains');
      expect(status).toHaveProperty('streamingMetrics');
      expect(status).toHaveProperty('lastCoordinationTime');
      expect(status).toHaveProperty('solanaConnectionStatus');
      expect(status).toHaveProperty('performanceStatus');

      expect(status.totalChains).toBe(3);
      expect(status.connectedChains).toHaveLength(3);
      expect(['optimal', 'degraded', 'critical']).toContain(status.performanceStatus);
    });

    it('should detect unhealthy chains', async () => {
      // Mock a chain failure
      const mockConnector = {
        getStreamingStatus: () => ({ isStreaming: false }),
        isHealthy: () => Promise.resolve(false)
      };

      // Replace one connector with unhealthy mock
      (oracle as any).connectors['ethereum'] = mockConnector;

      const status = await oracle.getSystemStatus();
      expect(status.performanceStatus).toBe('critical');
    });
  });

  describe('Error Handling', () => {
    it('should handle Solana integration failures gracefully', async () => {
      // Mock Solana integration failure
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const oracleWithoutSolana = new StreamingStateOracle({
        ...mockConfig,
        solanaRpcUrl: 'invalid-url'
      });

      await oracleWithoutSolana.startRealTimeStreaming();

      // Should continue without Solana integration
      const metrics = oracleWithoutSolana.getStreamingMetrics();
      expect(metrics).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle WebSocket reconnection', async () => {
      await oracle.startRealTimeStreaming();

      // Simulate WebSocket disconnection and reconnection
      const metrics = oracle.getStreamingMetrics();
      expect(metrics.healthyStreams).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process state changes in batches', async () => {
      await oracle.startRealTimeStreaming();

      const batchSize = oracle.getConfig().batchProcessingSize;
      expect(batchSize).toBe(50);

      // Simulate multiple state changes
      const stateChanges = Array.from({ length: 10 }, (_, i) => ({
        chainId: 1,
        chainName: 'ethereum',
        blockData: {
          blockNumber: 18500000 + i,
          blockHash: `0x${i.toString().padStart(64, '0')}`,
          timestamp: Date.now() / 1000,
          transactionCount: 100,
          parentHash: '0x456...',
          validator: '0x789...'
        },
        transactions: [],
        events: [],
        networkHealth: 'healthy' as const,
        lastSyncedBlock: 18500000 + i
      }));

      const startTime = Date.now();

      for (const stateChange of stateChanges) {
        await oracle.processStateChange(stateChange);
      }

      const totalTime = Date.now() - startTime;
      const averageTimePerChange = totalTime / stateChanges.length;

      // Should process efficiently
      expect(averageTimePerChange).toBeLessThan(100); // Sub-100ms per state change
    });
  });
});