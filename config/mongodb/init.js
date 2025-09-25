/**
 * MongoDB Initialization Script
 * Creates ChainSync database collections and indexes for optimal performance
 */

// Switch to chainsync database
db = db.getSiblingDB('chainsync');

print('🚀 Initializing ChainSync MongoDB database...');

// Create collections with validation schemas

// Deployments collection - stores cross-chain deployment information
db.createCollection('deployments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['deploymentId', 'status', 'bytecode', 'chains', 'createdAt'],
      properties: {
        deploymentId: { bsonType: 'string', description: 'Unique deployment identifier' },
        status: {
          enum: ['pending', 'deploying', 'completed', 'failed'],
          description: 'Current deployment status'
        },
        bytecode: { bsonType: 'string', description: 'Contract bytecode' },
        chains: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['name', 'status'],
            properties: {
              name: { bsonType: 'string' },
              chainId: { bsonType: 'int' },
              status: { enum: ['pending', 'deploying', 'completed', 'failed'] },
              transactionHash: { bsonType: 'string' },
              contractAddress: { bsonType: 'string' },
              gasUsed: { bsonType: 'long' },
              deployedAt: { bsonType: 'date' }
            }
          }
        },
        coordination: {
          bsonType: 'object',
          properties: {
            latencyMs: { bsonType: 'int', minimum: 0 },
            solanaTransactionId: { bsonType: 'string' },
            coordinatedAt: { bsonType: 'date' }
          }
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        completedAt: { bsonType: 'date' }
      }
    }
  }
});

// Transactions collection - stores transaction details
db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['transactionHash', 'chainName', 'status', 'createdAt'],
      properties: {
        transactionHash: { bsonType: 'string', description: 'Transaction hash' },
        chainName: { bsonType: 'string', description: 'Blockchain network name' },
        chainId: { bsonType: 'int', description: 'Chain ID' },
        status: { enum: ['pending', 'confirmed', 'failed'] },
        blockNumber: { bsonType: 'long' },
        fromAddress: { bsonType: 'string' },
        toAddress: { bsonType: 'string' },
        value: { bsonType: 'string', description: 'Transaction value in wei/atomic units' },
        gasUsed: { bsonType: 'long' },
        gasPrice: { bsonType: 'string' },
        deploymentId: { bsonType: 'string', description: 'Associated deployment ID' },
        createdAt: { bsonType: 'date' },
        confirmedAt: { bsonType: 'date' }
      }
    }
  }
});

// Chain state collection - stores current blockchain states
db.createCollection('chain_states', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['chainName', 'chainId', 'lastBlock', 'updatedAt'],
      properties: {
        chainName: { bsonType: 'string' },
        chainId: { bsonType: 'int' },
        lastBlock: {
          bsonType: 'object',
          required: ['number', 'hash', 'timestamp'],
          properties: {
            number: { bsonType: 'long' },
            hash: { bsonType: 'string' },
            timestamp: { bsonType: 'long' },
            validator: { bsonType: 'string' }
          }
        },
        health: { enum: ['healthy', 'degraded', 'offline'] },
        streamingStatus: { bsonType: 'bool' },
        lastSyncedAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Performance metrics collection - stores system performance data
db.createCollection('performance_metrics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['metricType', 'value', 'timestamp'],
      properties: {
        metricType: {
          enum: ['coordination_latency', 'deployment_time', 'transaction_throughput', 'chain_sync_time'],
          description: 'Type of performance metric'
        },
        value: { bsonType: 'double', description: 'Metric value' },
        chainName: { bsonType: 'string', description: 'Associated blockchain' },
        deploymentId: { bsonType: 'string', description: 'Associated deployment' },
        metadata: { bsonType: 'object', description: 'Additional metric context' },
        timestamp: { bsonType: 'date' }
      }
    }
  }
});

// Configuration collection - stores system configuration
db.createCollection('configurations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['key', 'value', 'updatedAt'],
      properties: {
        key: { bsonType: 'string', description: 'Configuration key' },
        value: { description: 'Configuration value (any type)' },
        description: { bsonType: 'string' },
        environment: { enum: ['development', 'staging', 'production'] },
        updatedBy: { bsonType: 'string' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

print('📋 Creating optimized indexes...');

// Deployments indexes
db.deployments.createIndex({ deploymentId: 1 }, { unique: true });
db.deployments.createIndex({ status: 1, createdAt: -1 });
db.deployments.createIndex({ 'chains.name': 1, status: 1 });
db.deployments.createIndex({ createdAt: -1 });
db.deployments.createIndex({ 'coordination.latencyMs': 1 }); // Performance queries

// Transactions indexes
db.transactions.createIndex({ transactionHash: 1 }, { unique: true });
db.transactions.createIndex({ chainName: 1, status: 1 });
db.transactions.createIndex({ deploymentId: 1 });
db.transactions.createIndex({ blockNumber: 1, chainName: 1 });
db.transactions.createIndex({ createdAt: -1 });

// Chain states indexes
db.chain_states.createIndex({ chainName: 1 }, { unique: true });
db.chain_states.createIndex({ chainId: 1 });
db.chain_states.createIndex({ health: 1, updatedAt: -1 });
db.chain_states.createIndex({ 'lastBlock.number': -1, chainName: 1 });

// Performance metrics indexes
db.performance_metrics.createIndex({ metricType: 1, timestamp: -1 });
db.performance_metrics.createIndex({ chainName: 1, timestamp: -1 });
db.performance_metrics.createIndex({ deploymentId: 1 });
db.performance_metrics.createIndex({ timestamp: -1 }); // Time-series queries

// Configuration indexes
db.configurations.createIndex({ key: 1 }, { unique: true });
db.configurations.createIndex({ environment: 1 });

print('🏗️ Creating sample configuration data...');

// Insert default configuration
db.configurations.insertMany([
  {
    key: 'coordination_latency_target',
    value: 400,
    description: 'Target coordination latency in milliseconds',
    environment: 'production',
    updatedBy: 'system',
    updatedAt: new Date()
  },
  {
    key: 'max_concurrent_deployments',
    value: 10,
    description: 'Maximum number of concurrent deployments',
    environment: 'production',
    updatedBy: 'system',
    updatedAt: new Date()
  },
  {
    key: 'batch_processing_size',
    value: 50,
    description: 'Number of operations to process in a batch',
    environment: 'production',
    updatedBy: 'system',
    updatedAt: new Date()
  },
  {
    key: 'supported_chains',
    value: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'],
    description: 'List of supported blockchain networks',
    environment: 'production',
    updatedBy: 'system',
    updatedAt: new Date()
  },
  {
    key: 'health_check_interval',
    value: 30000,
    description: 'Health check interval in milliseconds',
    environment: 'production',
    updatedBy: 'system',
    updatedAt: new Date()
  }
]);

print('👤 Creating application user...');

// Create application user for ChainSync services
db.createUser({
  user: 'chainsync_app',
  pwd: 'chainsync_app_password_change_in_production',
  roles: [
    {
      role: 'readWrite',
      db: 'chainsync'
    }
  ]
});

print('📊 Database statistics:');
db.stats();

print('✅ ChainSync MongoDB initialization completed successfully!');
print('');
print('📋 Created collections:');
print('  - deployments (with validation schema)');
print('  - transactions (with validation schema)');
print('  - chain_states (with validation schema)');
print('  - performance_metrics (with validation schema)');
print('  - configurations (with validation schema)');
print('');
print('🔍 Created indexes for optimal query performance');
print('⚙️ Inserted default configuration values');
print('👤 Created application user: chainsync_app');
print('');
print('🚀 Database ready for ChainSync services!');