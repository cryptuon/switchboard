/**
 * Global Jest Setup - runs before all tests
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = async () => {
  console.log('🚀 Setting up Switchboard test environment...');

  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-switchboard-testing';

    // Check if MongoDB is available for integration tests
    try {
      await execAsync('mongosh --version');
      console.log('✅ MongoDB CLI available');

      // Create test databases if they don't exist
      const testDatabases = [
        'switchboard-test',
        'switchboard-billing-test'
      ];

      for (const dbName of testDatabases) {
        try {
          await execAsync(`mongosh ${dbName} --eval "db.test.insertOne({test: 'setup'}); db.test.deleteMany({})"`);
          console.log(`✅ Test database '${dbName}' ready`);
        } catch (error) {
          console.warn(`⚠️ Could not setup test database '${dbName}':`, error.message);
        }
      }
    } catch (error) {
      console.warn('⚠️ MongoDB not available - database tests will be skipped');
      process.env.SKIP_DATABASE_TESTS = 'true';
    }

    // Check if services are running for integration tests
    const checkService = async (name, url) => {
      try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(`${url}/health`, { timeout: 2000 });
        if (response.ok) {
          console.log(`✅ ${name} service is running`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ ${name} service not available - related tests will be skipped`);
        return false;
      }
    };

    // Check service availability
    const apiAvailable = await checkService('API', process.env.API_BASE_URL || 'http://localhost:3000');
    const billingAvailable = await checkService('Billing', process.env.BILLING_BASE_URL || 'http://localhost:3001');

    if (!apiAvailable) {
      process.env.SKIP_API_INTEGRATION_TESTS = 'true';
    }

    if (!billingAvailable) {
      process.env.SKIP_BILLING_INTEGRATION_TESTS = 'true';
    }

    // Check for Stripe test keys
    if (!process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY.includes('fake')) {
      console.warn('⚠️ Stripe test keys not configured - Stripe tests will use mocks');
      process.env.SKIP_STRIPE_TESTS = 'true';
    } else {
      console.log('✅ Stripe test keys configured');
    }

    // Setup test data directory
    const fs = require('fs');
    const path = require('path');

    const testDataDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
      console.log('✅ Test results directory created');
    }

    // Global test state
    global.testState = {
      startTime: Date.now(),
      apiAvailable,
      billingAvailable,
      mongoAvailable: !process.env.SKIP_DATABASE_TESTS,
      stripeAvailable: !process.env.SKIP_STRIPE_TESTS
    };

    console.log('🎯 Test environment setup complete');

  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
};