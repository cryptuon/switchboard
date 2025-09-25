/**
 * Simple test for EVM Connector using public RPC endpoints
 */

import { JsonRpcProvider } from 'ethers';

async function testEVMConnector() {
  console.log('Testing EVM Connector with public RPC endpoints...');
  
  try {
    // Test Ethereum connection
    console.log('\n=== Testing Ethereum Connection ===');
    const ethereumProvider = new JsonRpcProvider('https://ethereum-rpc.publicnode.com');
    const ethBlockNumber = await ethereumProvider.getBlockNumber();
    console.log(`Ethereum block number: ${ethBlockNumber}`);
    
    const ethBlock = await ethereumProvider.getBlock(ethBlockNumber);
    console.log(`Ethereum block hash: ${ethBlock?.hash}`);
    console.log(`Ethereum block transactions: ${ethBlock?.transactions.length || 0}`);
    
    // Test Polygon connection
    console.log('\n=== Testing Polygon Connection ===');
    const polygonProvider = new JsonRpcProvider('https://polygon-rpc.com');
    const polygonBlockNumber = await polygonProvider.getBlockNumber();
    console.log(`Polygon block number: ${polygonBlockNumber}`);
    
    const polygonBlock = await polygonProvider.getBlock(polygonBlockNumber);
    console.log(`Polygon block hash: ${polygonBlock?.hash}`);
    console.log(`Polygon block transactions: ${polygonBlock?.transactions.length || 0}`);
    
    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testEVMConnector().catch(console.error);