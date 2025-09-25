/**
 * ChainSync Storage Usage Examples
 *
 * Demonstrates how to use the flexible storage system
 */

import { Logger } from '../logging/logger';
import { MetricsCollector } from '../metrics/metrics-collector';
import {
  StorageManager,
  StorageConfigFactory,
  DeploymentRepository,
  BlockchainEventRepository,
  SessionRepository
} from './index';

/**
 * Example: Setting up storage with MongoDB + ClickHouse
 */
export async function setupMongoClickHouseStorage(logger: Logger, metricsCollector?: MetricsCollector) {
  // Create configuration
  const config = StorageConfigFactory.createMongoClickHouse({
    mongodb: {
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT || '27017'),
      database: process.env.MONGODB_DATABASE || 'chainsync',
      username: process.env.MONGODB_USERNAME,
      password: process.env.MONGODB_PASSWORD,
      ssl: process.env.MONGODB_SSL === 'true'
    },
    clickhouse: {
      host: process.env.CLICKHOUSE_HOST || 'localhost',
      port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
      database: process.env.CLICKHOUSE_DATABASE || 'chainsync',
      username: process.env.CLICKHOUSE_USERNAME,
      password: process.env.CLICKHOUSE_PASSWORD
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  });

  // Initialize storage manager
  const storageManager = new StorageManager(config, logger, metricsCollector);
  await storageManager.initialize();

  // Create repositories
  const deploymentRepo = new DeploymentRepository(storageManager, logger, metricsCollector);
  const eventRepo = new BlockchainEventRepository(storageManager, logger, metricsCollector);
  const sessionRepo = new SessionRepository(storageManager, logger, metricsCollector);

  return {
    storageManager,
    repositories: {
      deployments: deploymentRepo,
      events: eventRepo,
      sessions: sessionRepo
    }
  };
}

/**
 * Example: Setting up storage with PostgreSQL + DuckDB
 */
export async function setupPostgresDuckDBStorage(logger: Logger, metricsCollector?: MetricsCollector) {
  // Create configuration
  const config = StorageConfigFactory.createPostgresDuckDB({
    postgresql: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'chainsync',
      username: process.env.POSTGRES_USERNAME || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      ssl: process.env.POSTGRES_SSL === 'true'
    },
    duckdb: {
      database: process.env.DUCKDB_PATH || './data/analytics.duckdb'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  });

  // Initialize storage manager
  const storageManager = new StorageManager(config, logger, metricsCollector);
  await storageManager.initialize();

  // Create repositories
  const deploymentRepo = new DeploymentRepository(storageManager, logger, metricsCollector);
  const eventRepo = new BlockchainEventRepository(storageManager, logger, metricsCollector);
  const sessionRepo = new SessionRepository(storageManager, logger, metricsCollector);

  return {
    storageManager,
    repositories: {
      deployments: deploymentRepo,
      events: eventRepo,
      sessions: sessionRepo
    }
  };
}

/**
 * Example: Development setup
 */
export async function setupDevelopmentStorage(logger: Logger) {
  const config = StorageConfigFactory.createDevelopment();

  const storageManager = new StorageManager(config, logger);
  await storageManager.initialize();

  const deploymentRepo = new DeploymentRepository(storageManager, logger);
  const eventRepo = new BlockchainEventRepository(storageManager, logger);
  const sessionRepo = new SessionRepository(storageManager, logger);

  return {
    storageManager,
    repositories: {
      deployments: deploymentRepo,
      events: eventRepo,
      sessions: sessionRepo
    }
  };
}

/**
 * Example: Using repositories
 */
export async function demonstrateRepositoryUsage() {
  const logger = new Logger({ level: 'info', serviceName: 'storage-example' });

  const { repositories, storageManager } = await setupDevelopmentStorage(logger);

  try {
    // Create a deployment
    const deployment = await repositories.deployments.create({
      userId: 'user123',
      name: 'My DeFi Protocol',
      chainId: 1,
      contractAddress: '0x1234567890123456789012345678901234567890',
      contractABI: {},
      status: 'active'
    });

    console.log('Created deployment:', deployment);

    // Create some events
    const events = [
      {
        deploymentId: deployment.id,
        chainId: 1,
        blockNumber: 18000000,
        blockHash: '0xblock1',
        transactionHash: '0xtx1',
        logIndex: 0,
        eventName: 'Transfer',
        eventSignature: 'Transfer(address,address,uint256)',
        eventData: { from: '0x123', to: '0x456', value: '1000' },
        timestamp: new Date(),
        contractAddress: deployment.contractAddress,
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
      },
      {
        deploymentId: deployment.id,
        chainId: 1,
        blockNumber: 18000001,
        blockHash: '0xblock2',
        transactionHash: '0xtx2',
        logIndex: 0,
        eventName: 'Approval',
        eventSignature: 'Approval(address,address,uint256)',
        eventData: { owner: '0x123', spender: '0x789', value: '2000' },
        timestamp: new Date(),
        contractAddress: deployment.contractAddress,
        topics: ['0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925']
      }
    ];

    await repositories.events.insertEvents(events);
    console.log('Created events:', events.length);

    // Create a session
    const session = await repositories.sessions.createSession({
      userId: 'user123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    });

    console.log('Created session:', session.sessionId);

    // Query data
    const userDeployments = await repositories.deployments.findByUserId('user123');
    console.log('User deployments:', userDeployments.length);

    const recentEvents = await repositories.events.findByDeployment(deployment.id);
    console.log('Recent events:', recentEvents.length);

    const userSessions = await repositories.sessions.getUserSessions('user123');
    console.log('User sessions:', userSessions.length);

  } finally {
    // Cleanup
    await storageManager.cleanup();
  }
}

/**
 * Example: Health monitoring
 */
export async function monitorStorageHealth(storageManager: StorageManager) {
  const health = {
    primary: await storageManager.checkDocumentStorage() || await storageManager.checkRelationalStorage(),
    analytics: await storageManager.checkTimeSeriesStorage(),
    cache: await storageManager.checkCacheStorage()
  };

  console.log('Storage health:', health);

  const stats = await storageManager.getStorageStats();
  console.log('Storage statistics:', stats);

  return health;
}

// Run example if this file is executed directly
if (require.main === module) {
  demonstrateRepositoryUsage().catch(console.error);
}