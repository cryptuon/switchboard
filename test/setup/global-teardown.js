/**
 * Global Jest Teardown - runs after all tests
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = async () => {
  console.log('🧹 Cleaning up ChainSync test environment...');

  try {
    const testDuration = Date.now() - (global.testState?.startTime || Date.now());
    console.log(`⏱️ Total test duration: ${(testDuration / 1000).toFixed(2)}s`);

    // Clean up test databases
    if (!process.env.SKIP_DATABASE_TESTS) {
      const testDatabases = [
        'chainsync-test',
        'chainsync-billing-test'
      ];

      for (const dbName of testDatabases) {
        try {
          // Drop test database to ensure clean state for next run
          await execAsync(`mongosh ${dbName} --eval "db.dropDatabase()"`);
          console.log(`✅ Test database '${dbName}' cleaned up`);
        } catch (error) {
          console.warn(`⚠️ Could not cleanup test database '${dbName}':`, error.message);
        }
      }
    }

    // Clean up temporary files
    const fs = require('fs');
    const path = require('path');

    const tempFiles = [
      path.join(process.cwd(), '.test-temp'),
      path.join(process.cwd(), 'test-temp')
    ];

    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) {
        fs.rmSync(tempFile, { recursive: true, force: true });
        console.log(`✅ Cleaned up temporary files: ${tempFile}`);
      }
    }

    // Generate test summary
    if (global.testState) {
      const summary = {
        testDuration: `${(testDuration / 1000).toFixed(2)}s`,
        environment: {
          apiAvailable: global.testState.apiAvailable,
          billingAvailable: global.testState.billingAvailable,
          mongoAvailable: global.testState.mongoAvailable,
          stripeAvailable: global.testState.stripeAvailable
        }
      };

      console.log('📊 Test Environment Summary:', JSON.stringify(summary, null, 2));
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
      console.log('✅ Garbage collection performed');
    }

    console.log('✨ Test environment cleanup complete');

  } catch (error) {
    console.error('❌ Error during test environment cleanup:', error);
    // Don't throw - allow tests to complete even if cleanup fails
  }
};