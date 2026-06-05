/**
 * Test script for Switchboard SDK
 */

import { Switchboard } from './src/index';

async function main() {
  // Create SDK instance
  const switchboard = new Switchboard({
    solanaRpcUrl: 'https://api.devnet.solana.com'
  });

  // Test fee calculation
  const estimatedFee = switchboard['calculateFee'](1000000); // 1,000,000 units
  console.log(`Estimated fee for transaction: ${estimatedFee}`);

  // Test contract deployment with fee estimation
  const deployment = await switchboard.deployContract({
    bytecode: '0x1234',
    chains: ['ethereum', 'polygon'],
    value: 1000000
  });
  
  console.log('Deployment result:', deployment);
  
  // Test transaction tracking
  const tracking = await switchboard.trackTransaction('test-transaction-id');
  console.log('Tracking result:', tracking);
}

// Run the test
main().catch(console.error);