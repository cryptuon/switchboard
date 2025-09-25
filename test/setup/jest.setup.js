/**
 * Jest Setup Configuration
 */

// Increase timeout for all tests
jest.setTimeout(30000);

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Keep console.log for test debugging
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error, // Keep errors visible
  };
}

// Global test utilities
global.testUtils = {
  /**
   * Create a delay for testing async operations
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random test data
   */
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Generate random email for testing
   */
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,

  /**
   * Mock blockchain transaction hash
   */
  generateMockTxHash: () => '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),

  /**
   * Mock blockchain address
   */
  generateMockAddress: () => '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),

  /**
   * Wait for condition to be true
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Environment variable defaults for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/chainsync-test';

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests, just log the error
});

// Clean up resources after each test suite
afterAll(async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Close any remaining connections
  if (global.testConnections) {
    await Promise.allSettled(
      global.testConnections.map(connection =>
        connection.close ? connection.close() : Promise.resolve()
      )
    );
  }
});