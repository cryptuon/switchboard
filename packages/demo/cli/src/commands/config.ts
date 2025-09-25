import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig, ChainSyncConfig } from '../utils/config';

export const configCommand = new Command('config')
  .description('Manage ChainSync configuration')
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .action(showConfig)
  )
  .addCommand(
    new Command('set')
      .description('Set configuration values')
      .argument('<key>', 'Configuration key (e.g., chains, network)')
      .argument('<value>', 'Configuration value')
      .action(setConfig)
  )
  .addCommand(
    new Command('add-chain')
      .description('Add a new chain to configuration')
      .argument('<chain>', 'Chain name (ethereum, polygon, arbitrum, etc.)')
      .option('-r, --rpc <url>', 'RPC URL for the chain')
      .action(addChain)
  )
  .addCommand(
    new Command('remove-chain')
      .description('Remove a chain from configuration')
      .argument('<chain>', 'Chain name to remove')
      .action(removeChain)
  )
  .addCommand(
    new Command('setup-rpcs')
      .description('Interactive RPC URL setup')
      .action(setupRpcs)
  )
  .addCommand(
    new Command('validate')
      .description('Validate current configuration')
      .action(validateConfig)
  );

async function showConfig(): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      console.log(chalk.yellow('⚠️  No configuration found. Run: chainsync init'));
      return;
    }

    console.log(chalk.blue('📋 Current ChainSync Configuration:\n'));

    // Project information
    console.log(chalk.cyan('Project:'));
    console.log(chalk.gray(`  Name: ${config.project.name}`));
    console.log(chalk.gray(`  Description: ${config.project.description}`));
    console.log(chalk.gray(`  Version: ${config.project.version}`));

    // Network configuration
    console.log(chalk.cyan('\nNetwork:'));
    console.log(chalk.gray(`  Target: ${config.network}`));

    // Chains
    console.log(chalk.cyan('\nChains:'));
    config.chains.forEach((chain: string) => {
      const rpcUrl = config.rpcs[chain];
      console.log(chalk.gray(`  ${chain}: ${rpcUrl ? '✅' : '❌'} ${rpcUrl || 'No RPC configured'}`));
    });

    // Solana configuration
    console.log(chalk.cyan('\nSolana:'));
    console.log(chalk.gray(`  Network: ${config.solana.network}`));
    console.log(chalk.gray(`  RPC URL: ${config.solana.rpcUrl}`));

    // Deployment settings
    console.log(chalk.cyan('\nDeployment:'));
    console.log(chalk.gray(`  Gas Limit: ${config.deployment.gasLimit}`));
    console.log(chalk.gray(`  Gas Price: ${config.deployment.gasPrice}`));
    console.log(chalk.gray(`  Confirmations: ${config.deployment.confirmations}`));

    // Configuration file path
    console.log(chalk.gray(`\n📁 Config file: ${path.resolve('.chainsync.yaml')}`));

  } catch (error) {
    console.error(chalk.red('Failed to show configuration:'), error);
  }
}

async function setConfig(key: string, value: string): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      console.log(chalk.red('❌ No configuration found. Run: chainsync init'));
      return;
    }

    // Parse the key path (e.g., "project.name", "deployment.gasLimit")
    const keyParts = key.split('.');
    let target: any = config;

    // Navigate to the parent object
    for (let i = 0; i < keyParts.length - 1; i++) {
      if (!target[keyParts[i]]) {
        target[keyParts[i]] = {};
      }
      target = target[keyParts[i]];
    }

    const finalKey = keyParts[keyParts.length - 1];

    // Convert value to appropriate type
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);
    else if (value.includes(',')) parsedValue = value.split(',').map(v => v.trim());

    target[finalKey] = parsedValue;

    await saveConfig(config);
    console.log(chalk.green(`✅ Updated ${key} = ${value}`));

  } catch (error) {
    console.error(chalk.red('Failed to set configuration:'), error);
  }
}

async function addChain(chain: string, options: { rpc?: string }): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      console.log(chalk.red('❌ No configuration found. Run: chainsync init'));
      return;
    }

    if (config.chains.includes(chain)) {
      console.log(chalk.yellow(`⚠️  Chain '${chain}' already exists in configuration`));
      return;
    }

    // Add chain to configuration
    config.chains.push(chain);

    // Add RPC URL if provided
    if (options.rpc) {
      config.rpcs[chain] = options.rpc;
    } else {
      // Prompt for RPC URL
      const rpcAnswer = await inquirer.prompt({
        type: 'input',
        name: 'rpc',
        message: `Enter RPC URL for ${chain}:`,
        validate: (input) => {
          if (!input.startsWith('http')) {
            return 'RPC URL must start with http:// or https://';
          }
          return true;
        }
      });
      config.rpcs[chain] = rpcAnswer.rpc;
    }

    await saveConfig(config);
    console.log(chalk.green(`✅ Added chain '${chain}' to configuration`));

  } catch (error) {
    console.error(chalk.red('Failed to add chain:'), error);
  }
}

async function removeChain(chain: string): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      console.log(chalk.red('❌ No configuration found. Run: chainsync init'));
      return;
    }

    if (!config.chains.includes(chain)) {
      console.log(chalk.yellow(`⚠️  Chain '${chain}' not found in configuration`));
      return;
    }

    // Confirm removal
    const confirmAnswer = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Remove '${chain}' from configuration?`,
      default: false
    });

    if (!confirmAnswer.confirm) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }

    // Remove chain and RPC
    config.chains = config.chains.filter((c: string) => c !== chain);
    delete config.rpcs[chain];

    await saveConfig(config);
    console.log(chalk.green(`✅ Removed chain '${chain}' from configuration`));

  } catch (error) {
    console.error(chalk.red('Failed to remove chain:'), error);
  }
}

async function setupRpcs(): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      console.log(chalk.red('❌ No configuration found. Run: chainsync init'));
      return;
    }

    console.log(chalk.blue('🔗 Interactive RPC Setup\n'));

    for (const chain of config.chains) {
      const currentRpc = config.rpcs[chain];

      console.log(chalk.cyan(`\n${chain.charAt(0).toUpperCase() + chain.slice(1)}:`));
      if (currentRpc) {
        console.log(chalk.gray(`Current: ${currentRpc}`));
      }

      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'update',
          message: `${currentRpc ? 'Update' : 'Set'} RPC URL for ${chain}?`,
          default: !currentRpc
        }
      ]);

      if (answers.update) {
        const rpcAnswer = await inquirer.prompt({
          type: 'input',
          name: 'rpc',
          message: `Enter RPC URL for ${chain}:`,
          default: currentRpc || getDefaultRpcUrl(chain, config.network),
          validate: (input) => {
            if (!input.startsWith('http')) {
              return 'RPC URL must start with http:// or https://';
            }
            return true;
          }
        });

        config.rpcs[chain] = rpcAnswer.rpc;
        console.log(chalk.green(`✅ Updated ${chain} RPC URL`));
      }
    }

    await saveConfig(config);
    console.log(chalk.green('\n✅ RPC configuration updated!'));

  } catch (error) {
    console.error(chalk.red('Failed to setup RPCs:'), error);
  }
}

async function validateConfig(): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      console.log(chalk.red('❌ No configuration found. Run: chainsync init'));
      return;
    }

    console.log(chalk.blue('🔍 Validating configuration...\n'));

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.project?.name) issues.push('Project name is missing');
    if (!config.chains || config.chains.length === 0) issues.push('No chains configured');
    if (!config.network) issues.push('Network not specified');

    // Check RPC URLs
    for (const chain of config.chains || []) {
      const rpcUrl = config.rpcs[chain];
      if (!rpcUrl) {
        warnings.push(`No RPC URL configured for ${chain}`);
      } else if (!rpcUrl.startsWith('http')) {
        issues.push(`Invalid RPC URL for ${chain}: must start with http:// or https://`);
      }
    }

    // Check Solana configuration
    if (!config.solana?.rpcUrl) {
      warnings.push('Solana RPC URL not configured');
    }

    // Check deployment settings
    if (config.deployment?.gasLimit && config.deployment.gasLimit < 21000) {
      warnings.push('Gas limit may be too low for contract deployment');
    }

    // Check environment variables
    const requiredEnvVars = ['SOLANA_RPC_URL'];
    config.chains?.forEach((chain: string) => {
      requiredEnvVars.push(`${chain.toUpperCase()}_RPC_URL`);
    });

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        warnings.push(`Environment variable ${envVar} not set`);
      }
    });

    // Report results
    if (issues.length === 0 && warnings.length === 0) {
      console.log(chalk.green('✅ Configuration is valid!'));
    } else {
      if (issues.length > 0) {
        console.log(chalk.red('❌ Configuration Issues:'));
        issues.forEach(issue => console.log(chalk.red(`  • ${issue}`)));
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Configuration Warnings:'));
        warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
      }

      console.log(chalk.blue('\n💡 Tips:'));
      console.log(chalk.gray('• Run "chainsync config setup-rpcs" to configure RPC URLs'));
      console.log(chalk.gray('• Check your .env file for required environment variables'));
      console.log(chalk.gray('• Use "chainsync config set <key> <value>" to fix specific issues'));
    }

  } catch (error) {
    console.error(chalk.red('Failed to validate configuration:'), error);
  }
}

function getDefaultRpcUrl(chain: string, network: string): string {
  const isMainnet = network === 'mainnet';

  const rpcUrls: { [key: string]: { mainnet: string; testnet: string } } = {
    ethereum: {
      mainnet: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://eth-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    polygon: {
      mainnet: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY'
    },
    arbitrum: {
      mainnet: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://arb-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    optimism: {
      mainnet: 'https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://opt-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    bsc: {
      mainnet: 'https://bsc-dataseed.binance.org/',
      testnet: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
    },
    avalanche: {
      mainnet: 'https://api.avax.network/ext/bc/C/rpc',
      testnet: 'https://api.avax-test.network/ext/bc/C/rpc'
    }
  };

  return rpcUrls[chain]?.[isMainnet ? 'mainnet' : 'testnet'] || '';
}