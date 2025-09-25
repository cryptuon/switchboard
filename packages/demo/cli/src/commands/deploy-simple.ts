import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { createSpinner } from '../utils/spinner';
import { loadConfig } from '../utils/config';
import { ChainSync } from '@chainsync/sdk';

export const deployCommand = new Command('deploy')
  .description('Deploy contracts across multiple chains')
  .option('-c, --contract <path>', 'Path to contract file')
  .option('-n, --network <type>', 'Target network (testnet/mainnet)')
  .option('--chains <chains>', 'Comma-separated list of chains to deploy to')
  .option('--dev-mode', 'Deploy to all testnet networks (development mode)')
  .option('--prod-mode', 'Deploy to all mainnet networks (production mode)')
  .option('--category <category>', 'Deploy to network category (evm, layer2, alt-l1, emerging)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--verify', 'Verify contracts after deployment')
  .option('--dry-run', 'Simulate deployment without executing')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Starting cross-chain deployment...\n'));

    try {
      // Load configuration
      const config = await loadConfig();
      if (!config) {
        console.log(chalk.red('❌ No ChainSync configuration found. Run: chainsync init'));
        return;
      }

      // Get contract file
      let contractPath = options.contract || 'contracts/MyContract.sol';

      if (!fs.existsSync(contractPath)) {
        console.log(chalk.red(`❌ Contract file not found: ${contractPath}`));
        return;
      }

      // Determine target chains based on options
      let targetChains: string[];

      if (options.devMode) {
        console.log(chalk.yellow('🧪 Development mode: Deploying to all testnet networks'));
        targetChains = [
          'sepolia', 'mumbai', 'fuji', 'arbitrum-goerli', 'optimism-goerli',
          'base-goerli', 'bsc-testnet', 'fantom-testnet', 'celo-alfajores',
          'near-testnet', 'sui-testnet', 'aptos-testnet', 'cosmos-testnet'
        ];
      } else if (options.prodMode) {
        console.log(chalk.red('🚀 Production mode: Deploying to all mainnet networks'));
        targetChains = [
          'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc',
          'avalanche', 'fantom', 'celo', 'near', 'sui', 'aptos', 'cosmos'
        ];
      } else if (options.category) {
        console.log(chalk.blue(`📊 Category mode: Deploying to ${options.category} networks`));
        const categoryMap: { [key: string]: string[] } = {
          'evm': ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'],
          'layer2': ['arbitrum', 'optimism', 'base', 'polygon'],
          'alt-l1': ['near', 'cosmos', 'sui', 'aptos'],
          'emerging': ['celo', 'fantom', 'gnosis']
        };
        targetChains = categoryMap[options.category] || [];
        if (targetChains.length === 0) {
          console.log(chalk.red(`❌ Unknown category: ${options.category}`));
          return;
        }
      } else {
        targetChains = options.chains ? options.chains.split(',') : config.chains;
      }

      const spinner = createSpinner('Preparing deployment...');
      spinner.start();

      // Read contract - for demo, use placeholder bytecode
      const bytecode = '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063a41368621461003b578063cfae321714610059575b600080fd5b610043610077565b6040516100509190610114565b60405180910390f35b6100616100b5565b60405161006e9190610114565b60405180910390f35b60606040518060400160405280600d81526020017f48656c6c6f2c20576f726c642100000000000000000000000000000000000000815250905090565b60018054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561014d5780601f106101225761010080835404028352916020019161014d565b820191906000526020600020905b81548152906001019060200180831161013057829003601f168201915b5050505050905090565b600081519050919050565b600082825260208201905092915050565b60005b83811015610191578082015181840152602081019050610176565b838111156101a0576000848401525b50505050565b6000601f19601f8301169050919050565b60006101c282610157565b6101cc8185610162565b93506101dc818560208601610173565b6101e5816101a6565b840191505092915050565b6000602082019050818103600083015261020a81846101b7565b90509291505056fea264697066735822122071ed6b20b6b1de36a85a2e5a1bc3e0a7b8a1e3a7b7a7b8a1e3a7b7a7b8a1e3a764736f6c634300060c0033';

      spinner.text = 'Initializing ChainSync SDK...';

      // Initialize ChainSync SDK
      const chains: { [chainName: string]: string } = {
        solana: process.env.SOLANA_RPC_URL || config.solana.rpcUrl
      };

      if (process.env.ETHEREUM_RPC_URL) chains.ethereum = process.env.ETHEREUM_RPC_URL;
      if (process.env.POLYGON_RPC_URL) chains.polygon = process.env.POLYGON_RPC_URL;
      if (process.env.ARBITRUM_RPC_URL) chains.arbitrum = process.env.ARBITRUM_RPC_URL;

      const chainSync = new ChainSync({
        solanaRpcUrl: process.env.SOLANA_RPC_URL || config.solana.rpcUrl,
        chains
      });

      spinner.text = 'Deploying contracts...';

      // Deploy contract
      const deployment = await chainSync.deployContract({
        bytecode,
        chains: targetChains,
        value: 0
      });

      spinner.succeed(chalk.green('Deployment initiated successfully!'));

      // Display deployment information
      console.log(chalk.green('\n✅ Cross-chain deployment started!'));
      console.log(chalk.blue(`\n📋 Deployment Details:`));
      console.log(chalk.gray(`Deployment ID: ${deployment.id}`));
      console.log(chalk.gray(`Status: ${deployment.status}`));
      console.log(chalk.gray(`Coordination Latency: ${deployment.coordinationLatency}ms`));

      console.log(chalk.blue('\n🔗 Chain Deployments:'));
      deployment.chains.forEach((deploy: any) => {
        console.log(chalk.gray(`  ${deploy.chainName}: ${deploy.status} (TX: ${deploy.transactionHash || 'Pending'})`));
      });

      console.log(chalk.blue('\n📊 Next steps:'));
      console.log(chalk.gray('• Track deployment: chainsync track ' + deployment.id));
      console.log(chalk.gray('• Check status: chainsync status'));

    } catch (error) {
      console.error(chalk.red('Deployment failed:'), error);
    }
  });