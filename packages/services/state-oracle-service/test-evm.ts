/**
 * Test script for EVM Connector
 */

import { EVMConnector } from './src/ethereum/connector';

async function main() {
  console.log('Testing EVM Connector...');
  
  // Create connector for Ethereum testnet
  const ethereumConnector = new EVMConnector({
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    chainId: 1
  });
  
  // Create connector for Polygon testnet
  const polygonConnector = new EVMConnector({
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137
  });
  
  try {
    // Test Ethereum connection
    console.log('\n=== Testing Ethereum Connection ===');
    const ethBlockNumber = await ethereumConnector.getBlockNumber();
    console.log(`Ethereum block number: ${ethBlockNumber}`);
    
    const ethBlock = await ethereumConnector.getBlock(ethBlockNumber);
    if (ethBlock) {
      console.log(`Ethereum block hash: ${ethBlock.hash}`);
      console.log(`Ethereum block transactions: ${ethBlock.transactions?.length || 0}`);
    }
    
    // Test Polygon connection
    console.log('\n=== Testing Polygon Connection ===');
    const polygonBlockNumber = await polygonConnector.getBlockNumber();
    console.log(`Polygon block number: ${polygonBlockNumber}`);
    
    const polygonBlock = await polygonConnector.getBlock(polygonBlockNumber);
    if (polygonBlock) {
      console.log(`Polygon block hash: ${polygonBlock.hash}`);
      console.log(`Polygon block transactions: ${polygonBlock.transactions?.length || 0}`);
    }
    
    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
main().catch(console.error);