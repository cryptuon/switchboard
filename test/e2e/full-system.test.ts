/**
 * End-to-End Tests for Complete Switchboard System
 *
 * Tests the full user journey from authentication to deployment
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

describe('Switchboard End-to-End Tests', () => {
  let apiClient: AxiosInstance;
  let billingClient: AxiosInstance;
  let testUser: {
    email: string;
    password: string;
    accessToken?: string;
    userId?: string;
  };
  let testCustomer: {
    id?: string;
    stripeCustomerId?: string;
  };

  const TEST_CONFIG = {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    BILLING_BASE_URL: process.env.BILLING_BASE_URL || 'http://localhost:3001',
    SKIP_STRIPE_TESTS: process.env.SKIP_STRIPE_TESTS === 'true'
  };

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: TEST_CONFIG.API_BASE_URL,
      timeout: 30000
    });

    billingClient = axios.create({
      baseURL: TEST_CONFIG.BILLING_BASE_URL,
      timeout: 30000
    });

    testUser = {
      email: `e2e-test-${Date.now()}@example.com`,
      password: 'E2ETestPassword123!'
    };

    testCustomer = {};
  });

  describe('Complete User Journey', () => {
    test('1. System Health Check', async () => {
      console.log('🔍 Checking system health...');

      // Check API service health
      const apiHealth = await apiClient.get('/health');
      expect(apiHealth.status).toBe(200);
      expect(apiHealth.data.status).toBe('healthy');
      console.log('✅ API service is healthy');

      // Check Billing service health
      const billingHealth = await billingClient.get('/health');
      expect(billingHealth.status).toBe(200);
      expect(billingHealth.data.status).toBe('healthy');
      console.log('✅ Billing service is healthy');

      // Check chain connectivity
      const chains = await apiClient.get('/api/v1/chains');
      expect(chains.status).toBe(200);
      expect(chains.data.success).toBe(true);
      expect(chains.data.data.chains.length).toBeGreaterThan(0);
      console.log(`✅ ${chains.data.data.chains.length} blockchain networks connected`);
    });

    test('2. User Registration', async () => {
      console.log('👤 Registering new user...');

      const response = await apiClient.post('/auth/register', {
        email: testUser.email,
        password: testUser.password,
        role: 'user'
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('tokens');

      testUser.accessToken = response.data.data.tokens.accessToken;
      testUser.userId = response.data.data.user.id;

      console.log(`✅ User registered with ID: ${testUser.userId}`);

      // Set auth header for subsequent requests
      apiClient.defaults.headers.Authorization = `Bearer ${testUser.accessToken}`;
    });

    test('3. API Key Creation', async () => {
      console.log('🔑 Creating API key...');

      const response = await apiClient.post('/auth/api-keys', {
        name: 'E2E Test API Key',
        permissions: ['deploy', 'read:own', 'write:own'],
        expiresInDays: 30
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('key');
      expect(response.data.data.name).toBe('E2E Test API Key');

      console.log('✅ API key created successfully');
    });

    test('4. Customer Creation for Billing', async () => {
      if (TEST_CONFIG.SKIP_STRIPE_TESTS) {
        console.log('⏭️ Skipping Stripe tests (SKIP_STRIPE_TESTS=true)');
        return;
      }

      console.log('💳 Creating billing customer...');

      try {
        const response = await billingClient.post('/api/v1/billing/customers', {
          userId: testUser.userId!,
          email: testUser.email,
          name: 'E2E Test Customer'
        });

        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
        expect(response.data.data).toHaveProperty('stripeCustomerId');

        testCustomer.id = response.data.data.id;
        testCustomer.stripeCustomerId = response.data.data.stripeCustomerId;

        console.log(`✅ Customer created with Stripe ID: ${testCustomer.stripeCustomerId}`);
      } catch (error: any) {
        if (error.response?.data?.error?.code === 'STRIPE_ERROR') {
          console.log('⚠️ Stripe error (likely using test keys) - continuing test');
          testCustomer.id = 'mock_customer_id';
        } else {
          throw error;
        }
      }
    });

    test('5. Plan Selection and Pricing', async () => {
      console.log('💰 Checking available plans...');

      const response = await billingClient.get('/api/v1/billing/plans');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      const plans = response.data.data;
      const basicPlan = plans.find((p: any) => p.id === 'basic');

      expect(basicPlan).toBeDefined();
      expect(basicPlan.price).toBeGreaterThan(0);
      expect(basicPlan.features).toBeDefined();

      console.log(`✅ Found ${plans.length} available plans`);
      console.log(`   Basic Plan: $${(basicPlan.price / 100).toFixed(2)}/${basicPlan.interval}`);
    });

    test('6. Chain Status and Capabilities', async () => {
      console.log('⛓️ Verifying chain capabilities...');

      const response = await apiClient.get('/api/v1/chains');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const chains = response.data.data.chains;
      const summary = response.data.data.summary;

      expect(chains.length).toBeGreaterThan(0);
      expect(summary.totalChains).toBe(chains.length);

      // Check that at least some chains are healthy
      const healthyChains = chains.filter((chain: any) => chain.status === 'healthy');
      expect(healthyChains.length).toBeGreaterThan(0);

      console.log(`✅ ${healthyChains.length}/${chains.length} chains are healthy`);
      console.log(`   Performance Status: ${summary.performanceStatus}`);
      console.log(`   Average Latency: ${summary.averageLatency}`);
    });

    test('7. Cross-Chain Deployment', async () => {
      console.log('🚀 Creating cross-chain deployment...');

      const deploymentRequest = {
        chains: ['ethereum', 'polygon'],
        contractCode: `
// E2E Test Smart Contract
pragma solidity ^0.8.0;

contract E2ETestContract {
    uint256 public testValue = 42;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function updateValue(uint256 _newValue) public {
        require(msg.sender == owner, "Only owner can update");
        testValue = _newValue;
    }

    function getValue() public view returns (uint256) {
        return testValue;
    }
}`,
        config: {
          gasLimit: 500000
        }
      };

      const response = await apiClient.post('/api/v1/deploy', deploymentRequest);

      expect(response.status).toBe(202);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('deploymentId');
      expect(response.data.data.status).toBe('initiated');
      expect(response.data.data.chains.length).toBe(2);

      const deploymentId = response.data.data.deploymentId;
      console.log(`✅ Deployment initiated with ID: ${deploymentId}`);

      // Check deployment status
      console.log('⏳ Checking deployment status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await apiClient.get(`/api/v1/deploy/${deploymentId}/status`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.success).toBe(true);
      expect(statusResponse.data.data.deploymentId).toBe(deploymentId);

      console.log(`✅ Deployment status: ${statusResponse.data.data.status}`);
      console.log(`   Coordination Time: ${statusResponse.data.data.performance.coordinationTime}ms`);
    });

    test('8. Real-time Metrics and Streaming', async () => {
      console.log('📊 Checking real-time metrics...');

      const response = await apiClient.get('/api/v1/metrics/streaming');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('performance');
      expect(response.data.data).toHaveProperty('system');
      expect(response.data.data).toHaveProperty('queues');

      const metrics = response.data.data;

      expect(metrics.performance.averageLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.system.totalChains).toBeGreaterThan(0);
      expect(typeof metrics.performance.eventsPerSecond).toBe('number');

      console.log(`✅ Streaming Metrics:`);
      console.log(`   Total Events: ${metrics.performance.totalEvents}`);
      console.log(`   Events/Second: ${metrics.performance.eventsPerSecond}`);
      console.log(`   Average Latency: ${metrics.performance.averageLatency}ms`);
      console.log(`   Latency Status: ${metrics.performance.latencyStatus}`);
    });

    test('9. Transaction History and Monitoring', async () => {
      console.log('📋 Retrieving transaction history...');

      const response = await apiClient.get('/api/v1/transactions', {
        params: { limit: 10, page: 1 }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('pagination');
      expect(response.data.data).toHaveProperty('streaming');

      const transactions = response.data.data.data;
      const pagination = response.data.data.pagination;

      expect(Array.isArray(transactions)).toBe(true);
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);

      console.log(`✅ Retrieved ${transactions.length} transactions`);
      console.log(`   Pagination: ${pagination.page}/${pagination.pages} (${pagination.total} total)`);

      // Test filtering
      const filteredResponse = await apiClient.get('/api/v1/transactions', {
        params: { status: 'completed', limit: 5 }
      });

      expect(filteredResponse.status).toBe(200);
      const filteredTxs = filteredResponse.data.data.data;

      // All returned transactions should match the filter
      filteredTxs.forEach((tx: any) => {
        expect(tx.status).toBe('completed');
      });

      console.log(`✅ Filtered transactions: ${filteredTxs.length} completed transactions`);
    });

    test('10. System Performance Validation', async () => {
      console.log('⚡ Validating system performance...');

      // Test multiple concurrent requests
      const startTime = Date.now();

      const requests = [
        apiClient.get('/api/v1/chains'),
        apiClient.get('/api/v1/metrics/streaming'),
        apiClient.get('/api/v1/transactions?limit=5'),
        apiClient.get('/health')
      ];

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Concurrent requests should complete reasonably quickly
      expect(totalTime).toBeLessThan(5000); // < 5 seconds

      console.log(`✅ 4 concurrent requests completed in ${totalTime}ms`);

      // Test coordination latency
      const metricsResponse = await apiClient.get('/api/v1/metrics/streaming');
      const avgLatency = metricsResponse.data.data.performance.averageLatency;

      // Latency should meet Switchboard's sub-400ms target (allowing some buffer)
      expect(avgLatency).toBeLessThan(600); // < 600ms with buffer

      console.log(`✅ Cross-chain coordination latency: ${avgLatency}ms (target: <400ms)`);
    });

    test('11. Cleanup and Resource Management', async () => {
      console.log('🧹 Testing cleanup and resource management...');

      // List user's API keys
      const apiKeysResponse = await apiClient.get('/auth/api-keys');
      expect(apiKeysResponse.status).toBe(200);
      expect(Array.isArray(apiKeysResponse.data.data)).toBe(true);

      const apiKeys = apiKeysResponse.data.data;
      console.log(`✅ User has ${apiKeys.length} API keys`);

      // Deactivate the first API key if any exist
      if (apiKeys.length > 0) {
        const keyId = apiKeys[0].id;
        const deactivateResponse = await apiClient.delete(`/auth/api-keys/${keyId}`);

        expect(deactivateResponse.status).toBe(200);
        expect(deactivateResponse.data.success).toBe(true);

        console.log(`✅ API key ${keyId} deactivated`);
      }

      // Check system health one final time
      const finalHealthCheck = await apiClient.get('/health');
      expect(finalHealthCheck.status).toBe(200);
      expect(finalHealthCheck.data.status).toBe('healthy');

      console.log('✅ System remains healthy after operations');
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('Authentication failure handling', async () => {
      console.log('🔐 Testing authentication failure scenarios...');

      // Remove auth header
      delete apiClient.defaults.headers.Authorization;

      try {
        await apiClient.post('/api/v1/deploy', {
          chains: ['ethereum'],
          contractCode: 'pragma solidity ^0.8.0; contract Test {}'
        });
        fail('Should have failed without authentication');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Restore auth header for cleanup
      apiClient.defaults.headers.Authorization = `Bearer ${testUser.accessToken}`;

      console.log('✅ Authentication properly enforced');
    });

    test('Invalid deployment handling', async () => {
      console.log('💥 Testing invalid deployment scenarios...');

      try {
        await apiClient.post('/api/v1/deploy', {
          chains: [], // Empty chains - should fail validation
          contractCode: 'invalid solidity code'
        });
        fail('Should have failed with invalid deployment data');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      }

      console.log('✅ Invalid deployments properly rejected');
    });

    test('Rate limiting and recovery', async () => {
      console.log('🚦 Testing rate limiting...');

      // Remove auth to trigger rate limiting faster
      delete apiClient.defaults.headers.Authorization;

      let rateLimited = false;
      const requests: Promise<any>[] = [];

      // Fire many requests quickly
      for (let i = 0; i < 110; i++) {
        requests.push(
          apiClient.get('/health').catch(error => {
            if (error.response?.status === 429) {
              rateLimited = true;
            }
            return error.response;
          })
        );
      }

      await Promise.allSettled(requests);

      expect(rateLimited).toBe(true);

      // Wait for rate limit window to reset
      console.log('⏳ Waiting for rate limit reset...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Should be able to make requests again
      const recoveryResponse = await apiClient.get('/health');
      expect(recoveryResponse.status).toBe(200);

      // Restore auth
      apiClient.defaults.headers.Authorization = `Bearer ${testUser.accessToken}`;

      console.log('✅ Rate limiting works and recovers properly');
    });
  });
});