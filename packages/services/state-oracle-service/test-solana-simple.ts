/**
 * Simple test for Solana Connector
 */

import { SolanaConnector } from './src/solana/connector';

async function testSolanaConnector() {
  console.log('Testing Solana Connector...');
  
  try {
    // Create connector for Solana devnet
    const solanaConnector = new SolanaConnector({
      rpcUrl: 'https://api.devnet.solana.com'
    });
    
    // Test Solana connection
    console.log('\n=== Testing Solana Connection ===');
    const slot = await solanaConnector.getSlot();
    console.log(`Solana slot: ${slot}`);
    
    const block = await solanaConnector.getBlock(slot);
    if (block) {
      console.log(`Solana blockhash: ${block.blockhash}`);
      console.log(`Solana transactions: ${block.transactions.length}`);
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
testSolanaConnector().catch(console.error);
