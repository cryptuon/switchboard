import { Command } from 'commander';
import chalk from 'chalk';

export const networksCommand = new Command('networks')
  .description('List all supported networks and chains')
  .option('-c, --category <category>', 'Filter by category (evm, layer2, alt-l1, emerging)')
  .option('-t, --testnet', 'Show testnet networks only')
  .option('-m, --mainnet', 'Show mainnet networks only')
  .option('--dev-mode', 'Show development mode (testnet) networks')
  .option('--prod-mode', 'Show production mode (mainnet) networks')
  .action(async (options) => {
    console.log(chalk.blue('🌐 Switchboard Supported Networks\n'));

    const networks = {
      evm: {
        title: '🌐 Ethereum Virtual Machine (EVM) Chains',
        chains: [
          { name: 'ethereum', id: 1, description: 'Ethereum Mainnet - The original smart contract platform' },
          { name: 'polygon', id: 137, description: 'Polygon - Fast and low-cost Ethereum scaling' },
          { name: 'arbitrum', id: 42161, description: 'Arbitrum - Optimistic rollup for Ethereum' },
          { name: 'optimism', id: 10, description: 'Optimism - Fast Ethereum Layer 2' },
          { name: 'bsc', id: 56, description: 'BNB Smart Chain - High performance blockchain' },
          { name: 'avalanche', id: 43114, description: 'Avalanche C-Chain - Fast consensus platform' },
          { name: 'fantom', id: 250, description: 'Fantom - DAG-based smart contract platform' }
        ]
      },
      layer2: {
        title: '⚡ Layer 2 Solutions',
        chains: [
          { name: 'base', id: 8453, description: 'Base - Coinbase Layer 2 on Ethereum' },
          { name: 'zksync', id: 324, description: 'zkSync Era - Zero-knowledge rollup' },
          { name: 'polygonzkevm', id: 1101, description: 'Polygon zkEVM - zk-powered scaling' },
          { name: 'linea', id: 59144, description: 'Linea - ConsenSys zkEVM rollup' },
          { name: 'mantle', id: 5000, description: 'Mantle - Modular blockchain stack' },
          { name: 'scroll', id: 534352, description: 'Scroll - zkEVM rollup for Ethereum' }
        ]
      },
      'alt-l1': {
        title: '🚀 Alternative Layer 1 Blockchains',
        chains: [
          { name: 'near', id: 99990001, description: 'NEAR Protocol - Sharded proof-of-stake blockchain' },
          { name: 'cosmos', id: 99990002, description: 'Cosmos Hub - Internet of blockchains' },
          { name: 'terra', id: 99990003, description: 'Terra - Programmable money for the web' },
          { name: 'sui', id: 99990004, description: 'Sui - Next-gen smart contract platform' },
          { name: 'aptos', id: 99990005, description: 'Aptos - Scalable Layer 1 blockchain' }
        ]
      },
      emerging: {
        title: '🌟 Emerging Networks',
        chains: [
          { name: 'celestia', id: 99990006, description: 'Celestia - Modular data availability network' },
          { name: 'starknet', id: 99990007, description: 'StarkNet - STARK-powered scaling' },
          { name: 'flow', id: 99990008, description: 'Flow - Blockchain for digital assets' },
          { name: 'celo', id: 42220, description: 'Celo - Mobile-first blockchain platform' },
          { name: 'gnosis', id: 100, description: 'Gnosis Chain - Community-owned network' },
          { name: 'moonbeam', id: 1284, description: 'Moonbeam - Ethereum on Polkadot' }
        ]
      },
      additional: {
        title: '🌍 Additional Networks',
        chains: [
          { name: 'cronos', id: 25, description: 'Cronos - Crypto.com blockchain' },
          { name: 'aurora', id: 1313161554, description: 'Aurora - Ethereum on NEAR' },
          { name: 'evmos', id: 9001, description: 'Evmos - EVM on Cosmos' },
          { name: 'kava', id: 2222, description: 'Kava - DeFi for Cosmos' },
          { name: 'harmony', id: 1666600000, description: 'Harmony - Sharded blockchain' },
          { name: 'metis', id: 1088, description: 'Metis - Decentralized autonomous company' }
        ]
      },
      testnet: {
        title: '🧪 Testnet Networks',
        chains: [
          { name: 'sepolia', id: 11155111, description: 'Sepolia - Ethereum testnet' },
          { name: 'goerli', id: 5, description: 'Goerli - Ethereum testnet (deprecated)' },
          { name: 'mumbai', id: 80001, description: 'Mumbai - Polygon testnet' },
          { name: 'fuji', id: 43113, description: 'Fuji - Avalanche testnet' }
        ]
      }
    };

    // Filter networks based on options
    const categoriesToShow = options.category
      ? [options.category]
      : Object.keys(networks);

    for (const category of categoriesToShow) {
      if (!networks[category as keyof typeof networks]) {
        console.log(chalk.red(`❌ Unknown category: ${category}`));
        continue;
      }

      const networkGroup = networks[category as keyof typeof networks];

      // Skip if filtering by testnet/mainnet
      if (options.testnet && category !== 'testnet') continue;
      if (options.mainnet && category === 'testnet') continue;

      console.log(chalk.cyan(networkGroup.title));
      console.log(chalk.gray('─'.repeat(networkGroup.title.length - 4))); // Subtract emoji chars

      networkGroup.chains.forEach(chain => {
        const chainId = chain.id < 99990000 ? `Chain ID: ${chain.id}` : 'Custom ID';
        console.log(`${chalk.green('●')} ${chalk.bold(chain.name.padEnd(15))} ${chalk.gray(`(${chainId})`)}`);
        console.log(`  ${chalk.gray(chain.description)}`);
        console.log('');
      });
    }

    // Show usage examples
    if (!options.category) {
      console.log(chalk.blue('📚 Usage Examples:'));
      console.log(chalk.gray('• Initialize with multiple chains:'));
      console.log(chalk.yellow('  switchboard init --chains ethereum,polygon,arbitrum,bsc'));
      console.log(chalk.gray('• Deploy to Layer 2 networks:'));
      console.log(chalk.yellow('  switchboard deploy --chains base,optimism,zksync,linea'));
      console.log(chalk.gray('• Use alternative blockchains:'));
      console.log(chalk.yellow('  switchboard init --chains near,sui,aptos,cosmos'));

      console.log(chalk.blue('\n🔧 Network Commands:'));
      console.log(chalk.gray('• View EVM chains only:'));
      console.log(chalk.yellow('  switchboard networks --category evm'));
      console.log(chalk.gray('• View Layer 2 solutions:'));
      console.log(chalk.yellow('  switchboard networks --category layer2'));
      console.log(chalk.gray('• View testnets only:'));
      console.log(chalk.yellow('  switchboard networks --testnet'));

      const totalChains = Object.values(networks).reduce((sum, group) => sum + group.chains.length, 0);
      console.log(chalk.green(`\n✨ Total supported networks: ${totalChains}+`));
      console.log(chalk.blue('📖 For detailed information, see: docs/supported-chains.md'));
    }
  });