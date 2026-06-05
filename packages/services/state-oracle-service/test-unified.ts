/**
 * Comprehensive test for Unified State Oracle
 */

import { UnifiedStateOracle } from './src/state-oracle';

async function main() {
  console.log('Testing Switchboard Unified State Oracle...');
  
  // Create unified state oracle instance
  const stateOracle = new UnifiedStateOracle();
  
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
    type: 'solana'
  });
  
  stateOracle.addChain({
    name: 'bitcoin',
    rpcUrl: 'https://bitcoin-testnet.publicnode.com',
    type: 'bitcoin'
  });
  
  // Listen for state data events
  stateOracle.on('stateData', (data: any) => {
    console.log(`\n=== Received state data from ${data.chain} ===`);
    console.log(`Block Number: ${data.blockNumber}`);
    console.log(`Timestamp: ${new Date(data.timestamp * 1000).toISOString()}`);
    console.log(`Transactions: ${data.transactions}`);
    console.log(`Hash: ${data.hash}`);
    console.log(`Metadata: ${JSON.stringify(data.metadata, null, 2)}`);
  });
  
  // Listen for specific chain events
  stateOracle.on('stateData:ethereum', (data: any) => {
    console.log(`\nEthereum state data event: Block ${data.blockNumber}`);
  });
  
  stateOracle.on('stateData:polygon', (data: any) => {
    console.log(`\nPolygon state data event: Block ${data.blockNumber}`);
  });
  
  stateOracle.on('stateData:solana', (data: any) => {
    console.log(`\nSolana state data event: Slot ${data.blockNumber}`);
  });
  
  stateOracle.on('stateData:bitcoin', (data: any) => {
    console.log(`\nBitcoin state data event: Block ${data.blockNumber}`);
  });
  
  // Start the state oracle
  await stateOracle.start();
  
  console.log('\nState Oracle started. Monitoring chains...');
  
  // Wait for a few seconds to collect data
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Stop the state oracle
  await stateOracle.stop();
  
  console.log('\n=== Test Completed Successfully ===');
}

// Run the test
main().catch(console.error);
