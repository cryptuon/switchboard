/**
 * Integration Tests for API Service
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { ApiService } from '../../packages/services/api/src/api-service';
import { StreamingStateOracle } from '../../packages/services/oracle-service/src/streaming-state-oracle';

describe('API Service Integration Tests', () => {
  let apiService: ApiService;
  let apiClient: AxiosInstance;
  let accessToken: string;

  const testConfig = {
    name: 'test-api-service',
    port: 3333,
    version: '1.0.0-test',
    corsOrigins: ['http://localhost:3000'],
    rateLimitWindowMs: 60000,
    rateLimitMax: 100,
    jwtSecret: 'test-jwt-secret-key-for-testing',
    database: {
      url: process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/chainsync-test',
      options: {}
    }
  };

  beforeAll(async () => {
    // Start API service
    apiService = new ApiService(testConfig);
    await apiService.start();

    // Create API client
    apiClient = axios.create({
      baseURL: `http://localhost:${testConfig.port}`,
      timeout: 10000
    });

    // Register a test user and get auth token
    try {
      const response = await apiClient.post('/auth/register', {
        email: 'test@example.com',
        password: 'testPassword123',
        role: 'admin'
      });
      accessToken = response.data.data.tokens.accessToken;
    } catch (error) {
      console.warn('Test user might already exist, attempting login...');
      try {
        const loginResponse = await apiClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'testPassword123'
        });
        accessToken = loginResponse.data.data.tokens.accessToken;
      } catch (loginError) {
        console.error('Failed to authenticate test user:', loginError);
      }
    }
  }, 30000);

  afterAll(async () => {
    if (apiService) {
      await apiService.stop();
    }
  }, 10000);

  beforeEach(() => {
    // Set auth header for authenticated requests
    if (accessToken) {
      apiClient.defaults.headers.Authorization = `Bearer ${accessToken}`;
    }
  });

  describe('Health and Info Endpoints', () => {
    test('GET /health should return service health', async () => {
      const response = await apiClient.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(['healthy', 'unhealthy']).toContain(response.data.status);
    });

    test('GET /info should return service information', async () => {
      const response = await apiClient.get('/info');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name', testConfig.name);
      expect(response.data).toHaveProperty('version', testConfig.version);
      expect(response.data).toHaveProperty('uptime');
    });

    test('GET /metrics should return prometheus metrics', async () => {
      const response = await apiClient.get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(typeof response.data).toBe('string');
      expect(response.data).toContain('http_requests_total');
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /auth/register should create new user', async () => {
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'testPassword123',
        role: 'user'
      };

      const response = await apiClient.post('/auth/register', testUser);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('tokens');
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.tokens).toHaveProperty('accessToken');
      expect(response.data.data.tokens).toHaveProperty('refreshToken');
    });

    test('POST /auth/login should authenticate user', async () => {
      const response = await apiClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'testPassword123'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('tokens');
    });

    test('POST /auth/login should reject invalid credentials', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'wrongPassword'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('AUTHENTICATION_FAILED');
      }
    });

    test('POST /auth/api-keys should create API key for authenticated user', async () => {
      const response = await apiClient.post('/auth/api-keys', {
        name: 'Test API Key',
        permissions: ['read:own', 'write:own'],
        expiresInDays: 30
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('key');
      expect(response.data.data).toHaveProperty('name', 'Test API Key');
      expect(response.data.data).toHaveProperty('permissions');
    });
  });

  describe('Chain Information Endpoints', () => {
    test('GET /api/v1/chains should return chain information', async () => {
      const response = await apiClient.get('/api/v1/chains');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('chains');
      expect(response.data.data).toHaveProperty('summary');
      expect(Array.isArray(response.data.data.chains)).toBe(true);
    });

    test('GET /api/v1/metrics/streaming should return streaming metrics', async () => {
      const response = await apiClient.get('/api/v1/metrics/streaming');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('performance');
      expect(response.data.data).toHaveProperty('system');
      expect(response.data.data).toHaveProperty('queues');
      expect(response.data.data).toHaveProperty('timestamp');
    });
  });

  describe('Deployment Endpoints', () => {
    test('POST /api/v1/deploy should create deployment', async () => {
      const deploymentRequest = {
        chains: ['ethereum', 'polygon'],
        contractCode: 'pragma solidity ^0.8.0; contract Test { uint256 public value = 42; }',
        config: {
          gasLimit: 500000
        }
      };

      const response = await apiClient.post('/api/v1/deploy', deploymentRequest);

      expect(response.status).toBe(202);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('deploymentId');
      expect(response.data.data).toHaveProperty('status', 'initiated');
      expect(response.data.data).toHaveProperty('chains');
      expect(response.data.data.chains.length).toBe(2);
    });

    test('POST /api/v1/deploy should validate request data', async () => {
      const invalidRequest = {
        chains: [], // Empty chains array should fail validation
        contractCode: 'invalid code'
      };

      try {
        await apiClient.post('/api/v1/deploy', invalidRequest);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      }
    });

    test('GET /api/v1/deploy/:deploymentId/status should return deployment status', async () => {
      // First create a deployment
      const deploymentRequest = {
        chains: ['ethereum'],
        contractCode: 'pragma solidity ^0.8.0; contract Test { uint256 public value = 42; }'
      };

      const deployResponse = await apiClient.post('/api/v1/deploy', deploymentRequest);
      const deploymentId = deployResponse.data.data.deploymentId;

      // Then check its status
      const statusResponse = await apiClient.get(`/api/v1/deploy/${deploymentId}/status`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.success).toBe(true);
      expect(statusResponse.data.data).toHaveProperty('deploymentId', deploymentId);
      expect(statusResponse.data.data).toHaveProperty('status');
      expect(statusResponse.data.data).toHaveProperty('chains');
      expect(statusResponse.data.data).toHaveProperty('performance');
    });
  });

  describe('Transaction Endpoints', () => {
    test('GET /api/v1/transactions should return transactions list', async () => {
      const response = await apiClient.get('/api/v1/transactions');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('pagination');
      expect(response.data.data).toHaveProperty('streaming');
      expect(Array.isArray(response.data.data.data)).toBe(true);
    });

    test('GET /api/v1/transactions should support pagination', async () => {
      const response = await apiClient.get('/api/v1/transactions', {
        params: { page: 1, limit: 5 }
      });

      expect(response.status).toBe(200);
      expect(response.data.data.pagination.page).toBe(1);
      expect(response.data.data.pagination.limit).toBe(5);
    });

    test('GET /api/v1/transactions should support filtering', async () => {
      const response = await apiClient.get('/api/v1/transactions', {
        params: { status: 'completed', chain: 'ethereum' }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      // All returned transactions should match the filter
      const transactions = response.data.data.data;
      if (transactions.length > 0) {
        transactions.forEach((tx: any) => {
          expect(tx.status).toBe('completed');
          expect(tx.chain).toBe('ethereum');
        });
      }
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      // Remove auth header for this test
      delete apiClient.defaults.headers.Authorization;

      const requests = [];
      // Make more requests than the rate limit allows (100 requests per window)
      for (let i = 0; i < 105; i++) {
        requests.push(apiClient.get('/health').catch(error => error));
      }

      const responses = await Promise.allSettled(requests);

      // Some requests should be rate limited
      const rateLimitedCount = responses.filter(result =>
        result.status === 'fulfilled' &&
        result.value?.response?.status === 429
      ).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent routes', async () => {
      try {
        await apiClient.get('/api/v1/non-existent-route');
        fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('NOT_FOUND');
      }
    });

    test('Should handle invalid JSON gracefully', async () => {
      try {
        await apiClient.post('/api/v1/deploy', 'invalid json', {
          headers: { 'Content-Type': 'application/json' }
        });
        fail('Should have thrown parsing error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});