/**
 * Test script for Solana Connector
 */

import { SolanaConnector } from './src/solana/connector';

async function main() {
  console.log('Testing Solana Connector...');
  
  // Create connector for Solana devnet
  const solanaConnector = new SolanaConnector({
    rpcUrl: 'https://api.devnet.solana.com'
  });
  
  try {
    // Test Solana connection
    console.log('\n=== Testing Solana Connection ===');
    const slot = await solanaConnector.getSlot();
    console.log(`Solana slot: ${slot}`);
    
    const block = await solanaConnector.getBlock(slot);
    if (block) {
      console.log(`Solana block hash: ${block.blockhash}`);
      console.log(`Solana block transactions: ${block.transactions?.length || 0}`);
    }
    
    // Test health
    const health = await solanaConnector.getHealth();
    console.log(`Solana cluster health: ${health}`);
    
    // Test recent blockhash
    const blockhash = await solanaConnector.getRecentBlockhash();
    console.log(`Recent blockhash: ${blockhash}`);
    
    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
main().catch(console.error);
