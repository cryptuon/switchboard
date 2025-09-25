/**
 * Simple test for Bitcoin Connector using public Bitcoin API
 */

import { BitcoinConnector } from './src/bitcoin/connector';

async function testBitcoinConnector() {
  console.log('Testing Bitcoin Connector...');
  
  try {
    // Create connector for Bitcoin testnet using a public API
    const bitcoinConnector = new BitcoinConnector({
      rpcUrl: 'https://bitcoin-testnet.publicnode.com'
    });
    
    // Test Bitcoin connection
    console.log('\n=== Testing Bitcoin Connection ===');
    const blockHeight = await bitcoinConnector.getBlockHeight();
    console.log(`Bitcoin block height: ${blockHeight}`);
    
    const block = await bitcoinConnector.getBlock(blockHeight);
    if (block) {
      console.log(`Bitcoin block hash: ${block.hash}`);
      console.log(`Bitcoin block transactions: ${block.tx.length}`);
    }
    
    // Test network info
    const networkInfo = await bitcoinConnector.getNetworkInfo();
    if (networkInfo) {
      console.log(`Network info: ${JSON.stringify(networkInfo, null, 2)}`);
    }
    
    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testBitcoinConnector().catch(console.error);
