/**
 * ChainSync Synchronization Service Entry Point
 *
 * Production-ready sync service with comprehensive blockchain monitoring
 */

import { SyncService, SyncServiceConfig } from './sync-service';

async function main() {
  const config: SyncServiceConfig = {
    name: 'chainsync-sync',
    version: process.env.npm_package_version || '0.1.0',
    enableMetrics: true,
    enableHealthChecks: true,
    logLevel: process.env.LOG_LEVEL || 'info',
    database: {
      url: process.env.DATABASE_URL || 'mongodb://localhost:27017/chainsync',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
    },
    chains: [
      {
        name: 'ethereum',
        type: 'ethereum',
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-key',
        chainId: 1,
        confirmations: 2,
        blockTime: 12
      },
      {
        name: 'polygon',
        type: 'polygon',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        chainId: 137,
        confirmations: 5,
        blockTime: 2
      },
      {
        name: 'solana',
        type: 'solana',
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        confirmations: 1,
        blockTime: 0.4
      }
    ],
    processing: {
      maxConcurrentDeployments: parseInt(process.env.MAX_CONCURRENT_DEPLOYMENTS || '5'),
      monitorIntervalMs: parseInt(process.env.MONITOR_INTERVAL_MS || '10000')
    }
  };

  const service = new SyncService(config);

  try {
    await service.start();
  } catch (error) {
    console.error('Failed to start sync service:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { SyncService };