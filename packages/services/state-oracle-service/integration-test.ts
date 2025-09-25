/**
 * Integration test for ChainSync State Oracle
 */

import { StateOracle } from './src/index';

async function main() {
  console.log('Testing ChainSync State Oracle Integration...');
  
  // Create state oracle instance
  const stateOracle = new StateOracle();
  
  // Add chains to monitor
  stateOracle.addChain({
    name: 'ethereum',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    chainId: 1,
    type: 'evm'
  });
  
  stateOracle.addChain({
    name: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    type: 'evm'
  });
  
  stateOracle.addChain({
    name: 'solana',
    rpcUrl: 'https://api.devnet.solana.com',
    chainId: 0, // Not used for Solana
    type: 'solana'
  });
  
  // Listen for state data events
  stateOracle.on('stateData', (data: any) => {
    console.log(`Received state data from ${data.chain}:`);
    console.log(`  Block: ${data.blockNumber}`);
    console.log(`  Timestamp: ${new Date(data.timestamp * 1000).toISOString()}`);
    console.log(`  Transactions: ${data.transactions.length}`);
    console.log(`  Hash: ${data.metadata.hash}`);
  });
  
  // Listen for specific chain events
  stateOracle.on('stateData:ethereum', (data: any) => {
    console.log(`Ethereum state data event: Block ${data.blockNumber}`);
  });
  
  stateOracle.on('stateData:polygon', (data: any) => {
    console.log(`Polygon state data event: Block ${data.blockNumber}`);
  });
  
  stateOracle.on('stateData:solana', (data: any) => {
    console.log(`Solana state data event: Slot ${data.blockNumber}`);
  });
  
  // Start the state oracle
  await stateOracle.start();
  
  console.log('State Oracle started. Monitoring chains...');
  
  // Wait for a few seconds to collect data
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Stop the state oracle
  await stateOracle.stop();
  
  console.log('\n=== Integration Test Completed ===');
}

// Run the integration test
main().catch(console.error);