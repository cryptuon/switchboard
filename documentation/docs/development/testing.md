# Testing

Guide to running and writing tests for Switchboard.

## Test Types

| Type | Location | Purpose |
|------|----------|---------|
| Unit | `*/tests/unit/` | Test individual functions |
| Integration | `*/tests/integration/` | Test API endpoints |
| E2E | `tests/e2e/` | Test full workflows |
| Performance | `tests/performance/` | Test latency and throughput |

## Running Tests

### All Tests

```bash
npm run test
```

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
# Start dependencies first
docker-compose up -d mongodb redis

# Run integration tests
npm run test:integration
```

### Specific Package

```bash
# SDK tests
npm run test --workspace=packages/sdk

# Customer API tests
npm run test --workspace=packages/services/customer-api
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## Writing Tests

### Unit Test Example

```typescript
// packages/sdk/tests/unit/switchboard.test.ts
import { describe, it, expect } from 'vitest';
import { Switchboard } from '../../src';

describe('Switchboard', () => {
  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const switchboard = new Switchboard({
        solana: { rpcUrl: 'https://api.devnet.solana.com' },
      });

      expect(switchboard).toBeDefined();
    });

    it('should throw on invalid config', () => {
      expect(() => new Switchboard({})).toThrow();
    });
  });

  describe('getSupportedChains', () => {
    it('should return list of chains', async () => {
      const switchboard = new Switchboard({
        solana: { rpcUrl: 'https://api.devnet.solana.com' },
      });

      const chains = await switchboard.getSupportedChains();

      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
    });
  });
});
```

### Integration Test Example

```typescript
// packages/services/customer-api/tests/integration/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Authentication API', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('POST /auth/register', () => {
    it('should register new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeDefined();
    });
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/deployment.test.ts
import { describe, it, expect } from 'vitest';
import { Switchboard } from '@switchboard/sdk';

describe('End-to-End Deployment', () => {
  it('should deploy contract across chains', async () => {
    const switchboard = new Switchboard({
      solana: { rpcUrl: process.env.SOLANA_RPC_URL },
      networks: {
        sepolia: {
          rpcUrl: process.env.ETHEREUM_RPC_URL,
          privateKey: process.env.PRIVATE_KEY,
        },
      },
    });

    const deployment = await switchboard.deployContract({
      name: 'TestContract',
      bytecode: '0x...',
      abi: [],
      chains: ['sepolia'],
    });

    expect(deployment.id).toBeDefined();

    // Wait for completion
    let status = await switchboard.trackDeployment(deployment.id);
    while (status.status === 'pending' || status.status === 'deploying') {
      await new Promise((r) => setTimeout(r, 5000));
      status = await switchboard.trackDeployment(deployment.id);
    }

    expect(status.status).toBe('completed');
    expect(status.addresses.sepolia).toBeDefined();
  }, 120000); // 2 minute timeout
});
```

## Test Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'tests'],
    },
    testTimeout: 30000,
  },
});
```

## Mocking

### Mock External Services

```typescript
import { vi } from 'vitest';

// Mock RPC provider
vi.mock('ethers', () => ({
  JsonRpcProvider: vi.fn().mockImplementation(() => ({
    getBlockNumber: vi.fn().mockResolvedValue(12345),
  })),
}));
```

### Mock Database

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URL = mongod.getUri();
});

afterAll(async () => {
  await mongod.stop();
});
```

## CI/CD

Tests run automatically on:

- Every pull request
- Every push to main
- Nightly builds

See `.github/workflows/test.yml` for configuration.

## Best Practices

1. **Write tests first** - TDD when possible
2. **Test edge cases** - Errors, empty inputs, boundaries
3. **Keep tests fast** - Mock external services
4. **Use descriptive names** - Test names are documentation
5. **Isolate tests** - Each test should be independent
