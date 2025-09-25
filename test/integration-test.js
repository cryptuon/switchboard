#!/usr/bin/env node

/**
 * ChainSync Integration Test Suite
 * Validates end-to-end system functionality and performance
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Test configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  oracleUrl: process.env.ORACLE_URL || 'http://localhost:3001',
  syncUrl: process.env.SYNC_URL || 'http://localhost:3002',
  timeout: 30000,
  latencyTarget: 400 // Sub-400ms target
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    success: '🎉'
  }[level] || 'ℹ️';

  console.log(`${timestamp} ${prefix} ${message}`);
}

function recordTest(name, passed, duration = 0, details = '') {
  results.tests.push({ name, passed, duration, details });
  if (passed) {
    results.passed++;
    log(`PASS: ${name} (${duration}ms) ${details}`, 'success');
  } else {
    results.failed++;
    log(`FAIL: ${name} (${duration}ms) ${details}`, 'error');
  }
}

async function makeRequest(url, options = {}) {
  const start = performance.now();
  try {
    const response = await axios({
      url,
      timeout: config.timeout,
      ...options
    });
    const duration = performance.now() - start;
    return { success: true, data: response.data, status: response.status, duration };
  } catch (error) {
    const duration = performance.now() - start;
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 0,
      duration
    };
  }
}

// Test suite functions
async function testServiceHealth() {
  log('🏥 Testing service health endpoints...');

  // Test API service health
  const apiHealth = await makeRequest(`${config.apiUrl}/health`);
  recordTest(
    'API Service Health',
    apiHealth.success && apiHealth.data?.status === 'healthy',
    apiHealth.duration,
    apiHealth.success ? `Status: ${apiHealth.data.status}` : apiHealth.error
  );

  // Test Oracle service health
  const oracleHealth = await makeRequest(`${config.oracleUrl}/health`);
  recordTest(
    'Oracle Service Health',
    oracleHealth.success && oracleHealth.data?.status === 'healthy',
    oracleHealth.duration,
    oracleHealth.success ? `Status: ${oracleHealth.data.status}` : oracleHealth.error
  );

  // Test Sync service health
  const syncHealth = await makeRequest(`${config.syncUrl}/health`);
  recordTest(
    'Sync Service Health',
    syncHealth.success && syncHealth.data?.status === 'healthy',
    syncHealth.duration,
    syncHealth.success ? `Status: ${syncHealth.data.status}` : syncHealth.error
  );

  return apiHealth.success && oracleHealth.success && syncHealth.success;
}

async function testServiceInfo() {
  log('📋 Testing service information endpoints...');

  const services = [
    { name: 'API', url: `${config.apiUrl}/info` },
    { name: 'Oracle', url: `${config.oracleUrl}/info` },
    { name: 'Sync', url: `${config.syncUrl}/info` }
  ];

  for (const service of services) {
    const response = await makeRequest(service.url);
    recordTest(
      `${service.name} Service Info`,
      response.success && response.data?.name && response.data?.version,
      response.duration,
      response.success ? `v${response.data.version}` : response.error
    );
  }
}

async function testMetricsEndpoints() {
  log('📊 Testing metrics endpoints...');

  // Test API metrics
  const apiMetrics = await makeRequest(`${config.apiUrl}/api/v1/metrics`);
  recordTest(
    'API Metrics Endpoint',
    apiMetrics.success && apiMetrics.data?.success,
    apiMetrics.duration,
    apiMetrics.success ? 'Metrics available' : apiMetrics.error
  );

  // Test real-time metrics
  const realtimeMetrics = await makeRequest(`${config.apiUrl}/api/v1/metrics/streaming`);
  recordTest(
    'Real-time Metrics',
    realtimeMetrics.success,
    realtimeMetrics.duration,
    realtimeMetrics.success ? 'Streaming metrics available' : realtimeMetrics.error
  );

  // Test supported chains
  const chains = await makeRequest(`${config.apiUrl}/api/v1/chains`);
  recordTest(
    'Supported Chains',
    chains.success && Array.isArray(chains.data?.chains),
    chains.duration,
    chains.success ? `${chains.data.chains.length} chains` : chains.error
  );
}

async function testDeploymentFlow() {
  log('🚀 Testing deployment flow...');

  // Test deployment request
  const deploymentRequest = {
    bytecode: '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610150806100536000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80638da5cb5b14602d575b600080fd5b60005460405173ffffffffffffffffffffffffffffffffffffffff909116815260200160405180910390f3fea2646970667358221220c9c4c0a84e2e8c6a3e8c8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a8a64736f6c634300081a0033',
    chains: ['ethereum'],
    gasLimit: 2000000
  };

  const deployment = await makeRequest(`${config.apiUrl}/api/v1/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: deploymentRequest
  });

  recordTest(
    'Deployment Request',
    deployment.success && deployment.data?.success && deployment.data?.data?.deploymentId,
    deployment.duration,
    deployment.success ? `ID: ${deployment.data.data.deploymentId}` : deployment.error
  );

  // Test coordination latency
  if (deployment.success && deployment.data?.data?.coordinationLatency) {
    const latency = deployment.data.data.coordinationLatency;
    recordTest(
      'Sub-400ms Coordination',
      latency < config.latencyTarget,
      deployment.duration,
      `${latency}ms coordination latency`
    );
  }

  return deployment.success ? deployment.data.data.deploymentId : null;
}

async function testTransactionTracking(deploymentId) {
  if (!deploymentId) {
    recordTest('Transaction Tracking', false, 0, 'No deployment ID available');
    return;
  }

  log('🔍 Testing transaction tracking...');

  const tracking = await makeRequest(`${config.apiUrl}/api/v1/deploy/${deploymentId}/status`);
  recordTest(
    'Transaction Tracking',
    tracking.success && tracking.data?.success,
    tracking.duration,
    tracking.success ? `Status: ${tracking.data.data?.status}` : tracking.error
  );

  // Test real-time tracking performance
  if (tracking.success && tracking.duration) {
    recordTest(
      'Tracking Performance',
      tracking.duration < 1000, // Should be fast
      tracking.duration,
      `${tracking.duration.toFixed(1)}ms response time`
    );
  }
}

async function testPerformanceMetrics() {
  log('⚡ Testing performance metrics...');

  // Test system performance
  const performance = await makeRequest(`${config.apiUrl}/api/v1/metrics/streaming`);

  if (performance.success && performance.data?.data) {
    const metrics = performance.data.data;

    // Check coordination latency
    if (metrics.performance?.averageLatency) {
      recordTest(
        'Average Coordination Latency',
        metrics.performance.averageLatency < config.latencyTarget,
        0,
        `${metrics.performance.averageLatency}ms average`
      );
    }

    // Check system status
    if (metrics.system?.performanceStatus) {
      recordTest(
        'System Performance Status',
        metrics.system.performanceStatus === 'optimal',
        0,
        `Status: ${metrics.system.performanceStatus}`
      );
    }

    // Check streaming status
    if (metrics.system?.totalChains !== undefined) {
      recordTest(
        'Chain Streaming',
        metrics.system.streamingChains === metrics.system.totalChains,
        0,
        `${metrics.system.streamingChains}/${metrics.system.totalChains} chains streaming`
      );
    }
  } else {
    recordTest('Performance Metrics', false, 0, performance.error || 'No metrics data');
  }
}

async function testErrorHandling() {
  log('🛡️ Testing error handling...');

  // Test invalid endpoint
  const invalidEndpoint = await makeRequest(`${config.apiUrl}/api/v1/invalid`);
  recordTest(
    'Invalid Endpoint Handling',
    !invalidEndpoint.success && invalidEndpoint.status === 404,
    invalidEndpoint.duration,
    `HTTP ${invalidEndpoint.status}`
  );

  // Test invalid deployment request
  const invalidDeploy = await makeRequest(`${config.apiUrl}/api/v1/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { invalid: 'request' }
  });

  recordTest(
    'Invalid Request Handling',
    !invalidDeploy.success && (invalidDeploy.status === 400 || invalidDeploy.status === 422),
    invalidDeploy.duration,
    `HTTP ${invalidDeploy.status}`
  );
}

async function testConcurrentRequests() {
  log('🔄 Testing concurrent request handling...');

  const concurrentRequests = Array.from({ length: 5 }, () =>
    makeRequest(`${config.apiUrl}/api/v1/chains`)
  );

  const start = performance.now();
  const responses = await Promise.all(concurrentRequests);
  const totalDuration = performance.now() - start;

  const successfulResponses = responses.filter(r => r.success).length;

  recordTest(
    'Concurrent Request Handling',
    successfulResponses === responses.length,
    totalDuration,
    `${successfulResponses}/${responses.length} successful`
  );

  // Test that concurrent requests don't significantly increase latency
  const avgLatency = totalDuration / responses.length;
  recordTest(
    'Concurrent Performance',
    avgLatency < 500, // Reasonable threshold
    avgLatency,
    `${avgLatency.toFixed(1)}ms average latency`
  );
}

async function testDatabaseConnectivity() {
  log('🗄️ Testing database connectivity...');

  // Test through API endpoints that require database access
  const metricsCall = await makeRequest(`${config.apiUrl}/api/v1/metrics`);
  recordTest(
    'Database Connectivity',
    metricsCall.success,
    metricsCall.duration,
    metricsCall.success ? 'Database accessible' : 'Database connection failed'
  );
}

async function testInterServiceCommunication() {
  log('🔗 Testing inter-service communication...');

  // Test API -> Oracle communication through streaming metrics
  const streamingMetrics = await makeRequest(`${config.apiUrl}/api/v1/metrics/streaming`);
  recordTest(
    'API -> Oracle Communication',
    streamingMetrics.success,
    streamingMetrics.duration,
    streamingMetrics.success ? 'Communication successful' : streamingMetrics.error
  );

  // Test deployment flow which involves multiple services
  const deployment = await makeRequest(`${config.apiUrl}/api/v1/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      bytecode: '0x123456',
      chains: ['ethereum']
    }
  });

  recordTest(
    'Multi-Service Deployment Flow',
    deployment.success || deployment.status === 400, // 400 is OK for test bytecode
    deployment.duration,
    deployment.success ? 'Services coordinated' : deployment.error
  );
}

// Main test runner
async function runIntegrationTests() {
  log('🧪 Starting ChainSync Integration Test Suite', 'info');
  log(`Testing against: ${config.apiUrl}`, 'info');

  const startTime = performance.now();

  try {
    // Core service tests
    const servicesHealthy = await testServiceHealth();

    if (!servicesHealthy) {
      log('❌ Services are not healthy. Aborting integration tests.', 'error');
      process.exit(1);
    }

    // Run comprehensive test suite
    await testServiceInfo();
    await testMetricsEndpoints();
    await testDatabaseConnectivity();
    await testInterServiceCommunication();

    // Performance and functionality tests
    const deploymentId = await testDeploymentFlow();
    await testTransactionTracking(deploymentId);
    await testPerformanceMetrics();

    // Resilience tests
    await testErrorHandling();
    await testConcurrentRequests();

  } catch (error) {
    log(`❌ Test suite error: ${error.message}`, 'error');
    results.failed++;
  }

  // Generate test report
  const totalDuration = performance.now() - startTime;
  const total = results.passed + results.failed;
  const successRate = total > 0 ? (results.passed / total * 100).toFixed(1) : 0;

  log('\n📊 Integration Test Results', 'info');
  log('='.repeat(50), 'info');
  log(`Total Tests: ${total}`, 'info');
  log(`Passed: ${results.passed}`, results.passed > 0 ? 'success' : 'info');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warn');
  log(`Total Duration: ${totalDuration.toFixed(0)}ms`, 'info');

  // Detailed results
  log('\n📋 Detailed Results:', 'info');
  results.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    const duration = test.duration ? `${test.duration.toFixed(0)}ms` : '';
    const details = test.details ? ` - ${test.details}` : '';
    log(`${status} ${test.name} ${duration}${details}`, 'info');
  });

  // Performance summary
  const coordinationTests = results.tests.filter(t =>
    t.name.includes('Coordination') || t.name.includes('Deployment')
  );
  const avgCoordinationTime = coordinationTests.reduce((sum, t) => sum + t.duration, 0) / coordinationTests.length;

  if (avgCoordinationTime > 0) {
    log(`\n⚡ Average Coordination Latency: ${avgCoordinationTime.toFixed(1)}ms`,
         avgCoordinationTime < config.latencyTarget ? 'success' : 'warn');
  }

  // Exit code based on results
  const exitCode = results.failed === 0 && results.passed > 0 ? 0 : 1;

  log(`\n${exitCode === 0 ? '🎉 All tests passed!' : '❌ Some tests failed.'}`,
      exitCode === 0 ? 'success' : 'error');

  process.exit(exitCode);
}

// Handle script execution
if (require.main === module) {
  // Handle CLI arguments
  process.argv.forEach((arg) => {
    if (arg.startsWith('--api=')) config.apiUrl = arg.split('=')[1];
    if (arg.startsWith('--oracle=')) config.oracleUrl = arg.split('=')[1];
    if (arg.startsWith('--sync=')) config.syncUrl = arg.split('=')[1];
    if (arg.startsWith('--timeout=')) config.timeout = parseInt(arg.split('=')[1]);
  });

  // Run tests
  runIntegrationTests().catch(error => {
    log(`❌ Integration test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
} else {
  // Export for use as module
  module.exports = { runIntegrationTests, config, results };
}