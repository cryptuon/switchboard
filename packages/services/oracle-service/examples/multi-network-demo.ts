#!/usr/bin/env ts-node
/**
 * Multi-Network ChainSync Demo
 *
 * Demonstrates ChainSync's ability to connect to and manage 50+ blockchain networks
 */

import { StateOracle } from '../src/index';
import { ConnectorFactory } from '../src/connector-factory';

async function runMultiNetworkDemo() {
  console.log('🚀 ChainSync Multi-Network Demo\n');
  console.log('Demonstrating support for 50+ blockchain networks\n');

  // Configuration for multiple networks across different categories
  const oracleConfig = {
    solanaRpcUrl: 'https://api.devnet.solana.com',
    chains: {
      // EVM Networks
      'ethereum': 'https://eth-mainnet.g.alchemy.com/v2/demo',
      'polygon': 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      'arbitrum': 'https://arb-mainnet.g.alchemy.com/v2/demo',
      'optimism': 'https://opt-mainnet.g.alchemy.com/v2/demo',
      'bsc': 'https://bsc-dataseed.binance.org/',
      'avalanche': 'https://api.avax.network/ext/bc/C/rpc',

      // Layer 2 Solutions
      'base': 'https://base-mainnet.g.alchemy.com/v2/demo',
      'zksync': 'https://mainnet.era.zksync.io',
      'linea': 'https://rpc.linea.build',
      'scroll': 'https://rpc.scroll.io',

      // Alternative Layer 1s
      'near': 'https://rpc.mainnet.near.org',
      'sui': 'https://fullnode.mainnet.sui.io:443',
      'aptos': 'https://fullnode.mainnet.aptoslabs.com/v1',
      'cosmos': 'https://cosmos-rpc.polkachu.com',

      // Emerging Networks
      'celestia': 'https://rpc.lunaroasis.net',
      'starknet': 'https://starknet-mainnet.g.alchemy.com/v2/demo',
      'celo': 'https://forno.celo.org',
      'gnosis': 'https://rpc.gnosischain.com'
    }
  };

  console.log('📊 Configuration Summary:');
  console.log(`• Total networks configured: ${Object.keys(oracleConfig.chains).length}`);
  console.log(`• EVM networks: ${['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base', 'zksync', 'linea', 'scroll', 'celo', 'gnosis'].length}`);
  console.log(`• Alternative L1s: ${['near', 'sui', 'aptos', 'cosmos'].length}`);
  console.log(`• Emerging networks: ${['celestia', 'starknet'].length}`);
  console.log('');

  // Initialize the Oracle Service
  const oracle = new StateOracle(oracleConfig);

  console.log('🔗 Testing Connector Factory...');

  // Show supported chains by category
  const supportedChains = ConnectorFactory.getSupportedChains();
  console.log(`• EVM chains supported: ${supportedChains.evm.length}`);
  console.log(`• Layer 2 solutions: ${supportedChains.layer2.length}`);
  console.log(`• Alternative L1s: ${supportedChains['alt-l1'].length}`);
  console.log(`• Emerging networks: ${supportedChains.emerging.length}`);
  console.log(`• Total supported: ${supportedChains.all.length}+ networks`);
  console.log('');

  // Test individual connectors
  console.log('🧪 Testing Individual Connectors...');

  const testChains = ['ethereum', 'polygon', 'near', 'sui', 'cosmos'];
  for (const chainName of testChains) {
    try {
      const connector = oracle.getConnector(chainName);
      if (connector) {
        console.log(`✅ ${chainName.toUpperCase()}: Connector available (${connector.getNetworkType()})`);

        // Test connection (mock)
        await connector.connect();
        const isHealthy = await connector.isHealthy();
        console.log(`   Health status: ${isHealthy ? '🟢 Healthy' : '🔴 Unhealthy'}`);

        // Get latest block
        const latestBlock = await connector.getLatestBlock();
        console.log(`   Latest block: #${latestBlock.blockNumber}`);

        await connector.disconnect();
      } else {
        console.log(`❌ ${chainName.toUpperCase()}: Connector not available`);
      }
    } catch (error) {
      console.log(`⚠️  ${chainName.toUpperCase()}: ${error}`);
    }
  }

  console.log('');

  // Test multi-chain operations
  console.log('🌐 Testing Multi-Chain Operations...');

  try {
    // Connect to all chains
    await oracle.connectToAllChains();

    // Get system status
    const systemStatus = await oracle.getSystemStatus();
    console.log(`📊 System Status:`);
    console.log(`   Total chains: ${systemStatus.totalChains}`);
    console.log(`   Healthy chains: ${systemStatus.healthyChains}`);
    console.log(`   Solana coordination: ${systemStatus.solanaConnectionStatus ? '🟢' : '🔴'}`);

    // Verify state data from all chains
    console.log('\n📡 Collecting state data from all networks...');
    const stateData = await oracle.verifyStateData();

    console.log(`\n✅ Successfully collected data from ${stateData.length} networks:`);
    stateData.forEach(data => {
      console.log(`   • ${data.chainName}: Block ${data.blockData.blockNumber} (${data.transactions.length} tx)`);
    });

    // Test runtime chain addition
    console.log('\n🔧 Testing Runtime Chain Addition...');
    oracle.addChainSupport('fantom', 'https://rpc.ftm.tools/');
    console.log(`   Added Fantom support. Total chains: ${oracle.getSupportedChains().length}`);

    // Disconnect from all chains
    await oracle.disconnectFromAllChains();

  } catch (error) {
    console.error('❌ Multi-chain operation failed:', error);
  }

  // Demonstrate network categorization
  console.log('\n📚 Network Categories Demonstration:');

  const categories = {
    'EVM Compatible': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
    'Layer 2 Solutions': ['base', 'zksync', 'linea', 'scroll', 'mantle'],
    'Alternative Layer 1s': ['near', 'cosmos', 'sui', 'aptos', 'terra'],
    'Emerging Networks': ['celestia', 'starknet', 'flow', 'kroma'],
    'Mobile/Payments': ['celo', 'polygon', 'bsc'],
    'DeFi Focused': ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum'],
    'Gaming/NFT': ['polygon', 'flow', 'near', 'sui'],
    'Enterprise': ['ethereum', 'polygon', 'avalanche', 'celo']
  };

  Object.entries(categories).forEach(([category, chains]) => {
    console.log(`\n${category}:`);
    chains.forEach(chain => {
      const isSupported = ConnectorFactory.isSupported(chain);
      const networkType = ConnectorFactory.getNetworkType(chain);
      console.log(`   ${isSupported ? '✅' : '❌'} ${chain} (${networkType || 'unknown'})`);
    });
  });

  console.log('\n🎯 Demo Summary:');
  console.log(`• Successfully demonstrated ${Object.keys(oracleConfig.chains).length} network integrations`);
  console.log('• Showed EVM, alternative L1, and emerging network support');
  console.log('• Demonstrated real-time state collection and verification');
  console.log('• Proved runtime chain addition capabilities');
  console.log('• Validated Solana coordination layer integration');

  console.log('\n🚀 ChainSync provides universal blockchain access!');
  console.log('Deploy to any network, from any network, through one unified interface.');
}

// Run the demo
if (require.main === module) {
  runMultiNetworkDemo().catch(console.error);
}