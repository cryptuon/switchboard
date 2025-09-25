/**
 * Basic SDK Test - Functional Validation
 * Tests core SDK functionality with simplified mocking
 */

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import ChainSync, { ChainSyncConfig } from '../src/index';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

// Mock WebSocket
const mockWebSocket = {
  readyState: 1,
  on: jest.fn(),
  close: jest.fn(),
  send: jest.fn()
};

jest.mock('ws', () => ({
  WebSocket: jest.fn(() => mockWebSocket)
}));

describe('ChainSync SDK - Basic Functionality', () => {
  let sdk: ChainSync;
  let mockConfig: ChainSyncConfig;

  beforeEach(() => {
    mockConfig = {
      solanaRpcUrl: 'https://api.devnet.solana.com',
      apiServiceUrl: 'http://localhost:3000',
      syncServiceUrl: 'http://localhost:3002',
      enableRealTimeStreaming: true,
      coordinationLatencyTarget: 400
    };

    sdk = new ChainSync(mockConfig);
    mockFetch.mockClear();
  });

  describe('SDK Initialization', () => {
    it('should create SDK with configuration', () => {
      expect(sdk).toBeInstanceOf(ChainSync);
      expect(sdk.getConfig().coordinationLatencyTarget).toBe(400);
    });

    it('should initialize successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as Response);

      await sdk.initialize();
      expect(sdk.isReady()).toBe(true);
    });
  });

  describe('Core SDK Methods', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as Response);
      await sdk.initialize();
    });

    it('should attempt contract deployment', async () => {
      const mockResponse = {
        success: true,
        data: {
          deploymentId: 'deploy_123',
          status: 'pending',
          chains: [],
          coordinationLatency: 250,
          timestamp: new Date().toISOString(),
          estimatedCompletionTime: new Date().toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.deployContract({
        bytecode: '0x123',
        chains: ['ethereum']
      });

      expect(result.id).toBe('deploy_123');
      expect(result.realTime).toBe(true);
    });

    it('should get performance metrics', () => {
      const metrics = sdk.getPerformanceMetrics();
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('lastRequestTime');
    });
  });

  describe('Error Handling', () => {
    it('should throw when not initialized', async () => {
      const uninitializedSdk = new ChainSync(mockConfig);

      await expect(uninitializedSdk.deployContract({
        bytecode: '0x123',
        chains: ['ethereum']
      })).rejects.toThrow('SDK not initialized');
    });
  });
});