/**
 * Jest Configuration for ChainSync Testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Roots for test discovery
  roots: ['<rootDir>/test', '<rootDir>/packages'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/*.(test|spec).(ts|js)'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__tests__/',
    '/test/',
    '.*\\.d\\.ts$'
  ],

  // Collect coverage from source files
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    '!packages/**/*.d.ts',
    '!packages/**/node_modules/**',
    '!packages/**/dist/**',
    '!packages/**/__tests__/**',
    '!packages/**/test/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.js'],

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Module name mapping for path resolution
  moduleNameMapping: {
    '^@chainsync/(.*)$': '<rootDir>/packages/$1/src',
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Global setup and teardown
  globalSetup: '<rootDir>/test/setup/global-setup.js',
  globalTeardown: '<rootDir>/test/setup/global-teardown.js',

  // Test projects for different types of tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/packages/**/*.(test|spec).(ts|js)'],
      testPathIgnorePatterns: [
        '/integration/',
        '/e2e/',
        '/performance/'
      ]
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.(test|spec).(ts|js)'],
      testTimeout: 60000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.(test|spec).(ts|js)'],
      testTimeout: 120000,
      maxWorkers: 1 // Run E2E tests sequentially
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/test/performance/**/*.(test|spec).(ts|js)'],
      testTimeout: 180000,
      maxWorkers: 1
    }
  ],

  // Verbose output for debugging
  verbose: false,

  // Report slow tests
  slowTestThreshold: 5000,

  // Exit process on test failure in CI
  forceExit: process.env.CI === 'true',

  // Detect open handles in CI
  detectOpenHandles: process.env.CI === 'true',

  // Don't clear mock calls between tests
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,

  // Custom reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml'
      }
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'ChainSync Test Report',
        outputPath: 'test-results/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ]
};