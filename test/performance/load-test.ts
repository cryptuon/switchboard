/**
 * Load Testing for ChainSync Services
 *
 * Tests system performance under various load conditions
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

describe('ChainSync Load Testing', () => {
  let apiClient: AxiosInstance;

  const TEST_CONFIG = {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    BILLING_BASE_URL: process.env.BILLING_BASE_URL || 'http://localhost:3001',
    CONCURRENT_USERS: parseInt(process.env.LOAD_TEST_USERS || '10'),
    REQUESTS_PER_USER: parseInt(process.env.LOAD_TEST_REQUESTS || '50'),
    TEST_DURATION_MS: parseInt(process.env.LOAD_TEST_DURATION || '30000') // 30 seconds
  };

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: TEST_CONFIG.API_BASE_URL,
      timeout: 10000,
      // Disable request/response interceptors for pure performance testing
      validateStatus: () => true // Don't reject on HTTP errors
    });
  });

  /**
   * Execute a load test with specified parameters
   */
  async function executeLoadTest(
    testName: string,
    requestFn: () => Promise<any>,
    concurrentUsers: number = TEST_CONFIG.CONCURRENT_USERS,
    requestsPerUser: number = TEST_CONFIG.REQUESTS_PER_USER
  ): Promise<LoadTestResult> {
    console.log(`\n🚀 Starting ${testName}...`);
    console.log(`   Concurrent Users: ${concurrentUsers}`);
    console.log(`   Requests per User: ${requestsPerUser}`);
    console.log(`   Total Requests: ${concurrentUsers * requestsPerUser}`);

    const results: LoadTestResult = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: []
    };

    const startTime = performance.now();
    const responseTimes: number[] = [];

    // Create concurrent user promises
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userRequests = Array.from({ length: requestsPerUser }, async (_, requestIndex) => {
        const requestStart = performance.now();

        try {
          const response = await requestFn();
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;

          responseTimes.push(responseTime);
          results.totalRequests++;

          if (response.status >= 200 && response.status < 400) {
            results.successfulRequests++;
          } else {
            results.failedRequests++;
            results.errors.push(`User ${userIndex} Request ${requestIndex}: HTTP ${response.status}`);
          }

          results.minResponseTime = Math.min(results.minResponseTime, responseTime);
          results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);

        } catch (error: any) {
          results.totalRequests++;
          results.failedRequests++;
          results.errors.push(`User ${userIndex} Request ${requestIndex}: ${error.message}`);
        }
      });

      await Promise.allSettled(userRequests);
    });

    // Wait for all users to complete
    await Promise.allSettled(userPromises);

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Calculate metrics
    results.averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    results.requestsPerSecond = (results.totalRequests / totalDuration) * 1000;

    // Normalize min response time
    if (results.minResponseTime === Infinity) {
      results.minResponseTime = 0;
    }

    console.log(`\n📊 ${testName} Results:`);
    console.log(`   Total Requests: ${results.totalRequests}`);
    console.log(`   Successful: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${results.minResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${results.maxResponseTime.toFixed(2)}ms`);
    console.log(`   Requests/Second: ${results.requestsPerSecond.toFixed(2)}`);
    console.log(`   Test Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    if (results.errors.length > 0) {
      console.log(`\n❌ First 5 Errors:`);
      results.errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
      if (results.errors.length > 5) {
        console.log(`   ... and ${results.errors.length - 5} more errors`);
      }
    }

    return results;
  }

  describe('API Service Load Tests', () => {
    test('Health endpoint load test', async () => {
      const results = await executeLoadTest(
        'Health Endpoint Load Test',
        () => apiClient.get('/health'),
        20, // 20 concurrent users
        25  // 25 requests each = 500 total requests
      );

      // Performance assertions
      expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.95); // 95% success rate
      expect(results.averageResponseTime).toBeLessThan(100); // < 100ms average
      expect(results.requestsPerSecond).toBeGreaterThan(10); // > 10 RPS
    }, 60000);

    test('Chains endpoint load test', async () => {
      const results = await executeLoadTest(
        'Chains Endpoint Load Test',
        () => apiClient.get('/api/v1/chains'),
        15, // 15 concurrent users
        20  // 20 requests each = 300 total requests
      );

      // Performance assertions for more complex endpoint
      expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.90); // 90% success rate
      expect(results.averageResponseTime).toBeLessThan(500); // < 500ms average
      expect(results.requestsPerSecond).toBeGreaterThan(5); // > 5 RPS
    }, 60000);

    test('Streaming metrics endpoint load test', async () => {
      const results = await executeLoadTest(
        'Streaming Metrics Load Test',
        () => apiClient.get('/api/v1/metrics/streaming'),
        10, // 10 concurrent users
        30  // 30 requests each = 300 total requests
      );

      // Performance assertions for metrics endpoint
      expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(800); // < 800ms average
      expect(results.requestsPerSecond).toBeGreaterThan(3); // > 3 RPS
    }, 60000);

    test('Rate limiting effectiveness', async () => {
      const results = await executeLoadTest(
        'Rate Limiting Test',
        () => apiClient.get('/api/v1/chains'),
        50, // 50 concurrent users - should trigger rate limiting
        10  // 10 requests each = 500 requests
      );

      // Should have some rate limited requests (429 status)
      const rateLimitedErrors = results.errors.filter(error => error.includes('429')).length;
      expect(rateLimitedErrors).toBeGreaterThan(0);

      // But shouldn't fail completely
      expect(results.successfulRequests).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Cross-Chain Deployment Load Tests', () => {
    test('Deployment creation under load', async () => {
      const deploymentRequest = {
        chains: ['ethereum', 'polygon'],
        contractCode: 'pragma solidity ^0.8.0; contract LoadTest { uint256 public value = 42; }'
      };

      const results = await executeLoadTest(
        'Deployment Creation Load Test',
        () => apiClient.post('/api/v1/deploy', deploymentRequest),
        5,  // 5 concurrent users (deployment is resource intensive)
        4   // 4 requests each = 20 total deployments
      );

      // Deployment should handle moderate load
      expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.80); // 80% success rate
      expect(results.averageResponseTime).toBeLessThan(2000); // < 2s average
    }, 120000); // 2 minute timeout for deployment tests

    test('Transaction listing under load', async () => {
      const results = await executeLoadTest(
        'Transaction Listing Load Test',
        () => apiClient.get('/api/v1/transactions?limit=10'),
        15, // 15 concurrent users
        25  // 25 requests each = 375 total requests
      );

      expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(600); // < 600ms average
      expect(results.requestsPerSecond).toBeGreaterThan(4);
    }, 60000);
  });

  describe('Memory and Resource Tests', () => {
    test('Memory usage under sustained load', async () => {
      const initialMemory = process.memoryUsage();

      console.log(`\n🧠 Initial Memory Usage:`);
      console.log(`   RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

      // Run sustained load for 30 seconds
      const startTime = Date.now();
      const requests: Promise<any>[] = [];

      while (Date.now() - startTime < 30000) { // 30 seconds
        // Add new request every 100ms
        requests.push(
          apiClient.get('/health').catch(() => {}) // Ignore errors, just measure memory
        );

        // Don't overwhelm the system
        if (requests.length % 50 === 0) {
          await Promise.allSettled(requests.splice(0, 25)); // Process in batches

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for remaining requests
      await Promise.allSettled(requests);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage();

      console.log(`\n🧠 Final Memory Usage:`);
      console.log(`   RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`   Memory Increase: ${memoryIncrease.toFixed(2)} MB`);

      // Memory increase should be reasonable (< 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50);
    }, 45000);

    test('Response time consistency under varying load', async () => {
      const responseTimesLowLoad: number[] = [];
      const responseTimesHighLoad: number[] = [];

      // Low load test (1 request every 100ms for 5 seconds)
      console.log('\n📊 Testing response time under low load...');
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await apiClient.get('/health');
        const end = performance.now();
        responseTimesLowLoad.push(end - start);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // High load test (10 concurrent requests for 5 seconds)
      console.log('📊 Testing response time under high load...');
      const highLoadPromises: Promise<any>[] = [];

      for (let i = 0; i < 100; i++) {
        highLoadPromises.push((async () => {
          const start = performance.now();
          await apiClient.get('/health');
          const end = performance.now();
          responseTimesHighLoad.push(end - start);
        })());
      }

      await Promise.allSettled(highLoadPromises);

      const avgLowLoad = responseTimesLowLoad.reduce((a, b) => a + b, 0) / responseTimesLowLoad.length;
      const avgHighLoad = responseTimesHighLoad.reduce((a, b) => a + b, 0) / responseTimesHighLoad.length;

      console.log(`   Average response time (low load): ${avgLowLoad.toFixed(2)}ms`);
      console.log(`   Average response time (high load): ${avgHighLoad.toFixed(2)}ms`);
      console.log(`   Performance degradation: ${((avgHighLoad / avgLowLoad - 1) * 100).toFixed(1)}%`);

      // High load shouldn't degrade performance by more than 300%
      expect(avgHighLoad / avgLowLoad).toBeLessThan(4.0);
    }, 60000);
  });
});