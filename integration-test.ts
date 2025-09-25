/**
 * Integration test for ChainSync components
 */

import { StateOracle } from './packages/services/oracle-service/src/index';
import { ChainSync } from './packages/sdk/src/index';

async function main() {
  console.log('Running ChainSync integration test...');
  
  // Create oracle service with testnet URLs
  const oracle = new StateOracle({
    solanaRpcUrl: 'https://api.devnet.solana.com',
    ethereumRpcUrl: 'https://ethereum-rpc.publicnode.com',
    polygonRpcUrl: 'https://polygon-rpc.com'
  });
  
  // Create SDK instance
  const chainSync = new ChainSync({
    solanaRpcUrl: 'https://api.devnet.solana.com'
  });
  
  // Test 1: Collect state data from all chains
  console.log('\nTest 1: Collecting state data from all chains...');
  await oracle.collectStateData();
  
  // Test 2: Fee estimation
  console.log('\nTest 2: Testing fee estimation...');
  const testValues = [1000000, 5000000, 10000000]; // Different transaction values
  
  for (const value of testValues) {
    const estimatedFee = chainSync['calculateFee'](value);
    const percentage = (estimatedFee / value * 100).toFixed(4);
    console.log(`  Transaction value: ${value}, Estimated fee: ${estimatedFee} (${percentage}%)`);
  }
  
  // Test 3: Contract deployment with fee estimation
  console.log('\nTest 3: Testing contract deployment with fee estimation...');
  const deployment = await chainSync.deployContract({
    bytecode: '0x1234',
    chains: ['ethereum', 'polygon'],
    value: 1000000
  });
  
  console.log('  Deployment result:', deployment);
  
  // Test 4: Transaction tracking
  console.log('\nTest 4: Testing transaction tracking...');
  const tracking = await chainSync.trackTransaction('test-transaction-id-12345');
  console.log('  Tracking result:', tracking);
  
  console.log('\nIntegration test completed successfully!');
}

// Run the integration test
main().catch(console.error);