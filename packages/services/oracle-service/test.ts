/**
 * Test script for Switchboard Oracle Service
 */

import { StateOracle } from './src/index';

async function main() {
  // Create oracle service with testnet URLs
  const oracle = new StateOracle({
    solanaRpcUrl: 'https://api.devnet.solana.com',
    ethereumRpcUrl: 'https://ethereum-rpc.publicnode.com',
    polygonRpcUrl: 'https://polygon-rpc.com'
  });

  // Collect state data
  await oracle.collectStateData();
}

// Run the test
main().catch(console.error);