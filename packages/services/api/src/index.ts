/**
 * ChainSync API Service Entry Point
 *
 * Production-ready API service with comprehensive error handling and monitoring
 */

import { ApiService } from './api-service';

async function main() {
  const service = new ApiService({
    name: 'chainsync-api',
    version: process.env.npm_package_version || '0.1.0',
    port: parseInt(process.env.PORT || '3000'),
    enableMetrics: true,
    enableHealthChecks: true,
    logLevel: process.env.LOG_LEVEL || 'info'
  });

  try {
    await service.start();
  } catch (error) {
    console.error('Failed to start API service:', error);
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

export { ApiService };