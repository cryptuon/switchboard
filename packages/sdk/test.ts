/**
 * Test script for ChainSync SDK
 */

import { ChainSync } from './src/index';

async function main() {
  // Create SDK instance
  const chainSync = new ChainSync({
    solanaRpcUrl: 'https://api.devnet.solana.com'
  });

  // Test fee calculation
  const estimatedFee = chainSync['calculateFee'](1000000); // 1,000,000 units
  console.log(`Estimated fee for transaction: ${estimatedFee}`);

  // Test contract deployment with fee estimation
  const deployment = await chainSync.deployContract({
    bytecode: '0x1234',
    chains: ['ethereum', 'polygon'],
    value: 1000000
  });
  
  console.log('Deployment result:', deployment);
  
  // Test transaction tracking
  const tracking = await chainSync.trackTransaction('test-transaction-id');
  console.log('Tracking result:', tracking);
}

// Run the test
main().catch(console.error);