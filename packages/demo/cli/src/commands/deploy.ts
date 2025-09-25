import { Command } from 'commander';
import inquirer from 'inquirer';
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
  .option('-y, --yes', 'Skip confirmation prompts')
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
      let contractPath = options.contract;
      if (!contractPath) {
        const contractAnswer = await inquirer.prompt({
          type: 'list',
          name: 'contract',
          message: 'Select contract to deploy:',
          choices: getAvailableContracts()
        });
        contractPath = contractAnswer.contract;
      }

      if (!fs.existsSync(contractPath)) {
        console.log(chalk.red(`❌ Contract file not found: ${contractPath}`));
        return;
      }

      // Get deployment chains
      let targetChains = options.chains ? options.chains.split(',') : config.chains;
      if (!options.chains && !options.yes) {
        const chainAnswer = await inquirer.prompt({
          type: 'checkbox',
          name: 'chains',
          message: 'Select chains for deployment:',
          choices: config.chains.map((chain: string) => ({ name: chain, value: chain, checked: true })),
          validate: (input) => input.length > 0 || 'Select at least one chain'
        });
        targetChains = chainAnswer.chains;
      }

      // Get network
      const network = options.network || config.network;

      // Deployment confirmation
      if (!options.yes) {
        console.log(chalk.cyan('\n📋 Deployment Summary:'));
        console.log(chalk.gray(`Contract: ${contractPath}`));
        console.log(chalk.gray(`Chains: ${targetChains.join(', ')}`));
        console.log(chalk.gray(`Network: ${network}`));

        const confirmAnswer = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with deployment?',
          default: true
        });

        if (!confirmAnswer.confirm) {
          console.log(chalk.yellow('Deployment cancelled.'));
          return;
        }
      }

      const spinner = createSpinner('Preparing deployment...');
      spinner.start();

      // Read contract bytecode
      const contractContent = fs.readFileSync(contractPath, 'utf8');
      let bytecode: string;

      if (contractPath.endsWith('.sol')) {
        // Compile Solidity contract
        bytecode = await compileSolidityContract(contractContent);
      } else if (contractPath.endsWith('.bin')) {
        bytecode = contractContent.trim();
      } else {
        throw new Error('Unsupported contract format. Use .sol or .bin files.');
      }

      spinner.text = 'Initializing ChainSync SDK...';

      // Initialize ChainSync SDK
      const chainSync = new ChainSync({
        solanaRpcUrl: process.env.SOLANA_RPC_URL!,
        ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
        polygonRpcUrl: process.env.POLYGON_RPC_URL,
        arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL,
        optimismRpcUrl: process.env.OPTIMISM_RPC_URL,
        bscRpcUrl: process.env.BSC_RPC_URL,
        avalancheRpcUrl: process.env.AVALANCHE_RPC_URL
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
      console.log(chalk.gray(`Estimated Fee: ${deployment.estimatedFee} tokens`));

      console.log(chalk.blue('\n🔗 Chain Deployments:'));
      deployment.deployments.forEach((deploy) => {
        console.log(chalk.gray(`  ${deploy.chain}: ${deploy.status} (TX: ${deploy.transactionHash || 'Pending'})`));
      });

      // Save deployment info
      saveDeploymentInfo(deployment);

      console.log(chalk.blue('\n📊 Next steps:'));
      console.log(chalk.gray('• Track deployment: chainsync track ' + deployment.id));
      console.log(chalk.gray('• Check status: chainsync status'));
      console.log(chalk.gray('• View analytics: chainsync analytics'));

    } catch (error) {
      console.error(chalk.red('Deployment failed:'), error);
    }
  });

function getAvailableContracts(): Array<{ name: string; value: string }> {
  const contractsDir = 'contracts';
  if (!fs.existsSync(contractsDir)) {
    return [{ name: 'No contracts found', value: '' }];
  }

  const files = fs.readdirSync(contractsDir);
  const contracts = files
    .filter(file => file.endsWith('.sol') || file.endsWith('.bin'))
    .map(file => ({
      name: file,
      value: path.join(contractsDir, file)
    }));

  return contracts.length > 0 ? contracts : [{ name: 'No contracts found', value: '' }];
}

async function compileSolidityContract(source: string): Promise<string> {
  // This is a simplified compilation - in practice, you'd use solc
  // For now, return a placeholder bytecode
  console.log(chalk.yellow('⚠️  Using mock bytecode. Configure solc for real compilation.'));
  return '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063a41368621461003b578063cfae321714610059575b600080fd5b610043610077565b6040516100509190610114565b60405180910390f35b6100616100b5565b60405161006e9190610114565b60405180910390f35b60606040518060400160405280600d81526020017f48656c6c6f2c20576f726c642100000000000000000000000000000000000000815250905090565b606060018054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561014d5780601f106101225761010080835404028352916020019161014d565b820191906000526020600020905b81548152906001019060200180831161013057829003601f168201915b5050505050905090565b600081519050919050565b600082825260208201905092915050565b60005b83811015610191578082015181840152602081019050610176565b838111156101a0576000848401525b50505050565b6000601f19601f8301169050919050565b60006101c282610157565b6101cc8185610162565b93506101dc818560208601610173565b6101e5816101a6565b840191505092915050565b6000602082019050818103600083015261020a81846101b7565b90509291505056fea264697066735822122071ed6b20b6b1de36a85a2e5a1bc3e0a7b8a1e3a7b7a7b8a1e3a7b7a7b8a1e3a764736f6c634300060c0033';
}

function saveDeploymentInfo(deployment: any): void {
  const deploymentsDir = 'deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${deployment.id}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log(chalk.gray(`💾 Deployment info saved to: ${deploymentFile}`));
}