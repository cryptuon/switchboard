import { Command } from 'commander';
import chalk from 'chalk';
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
      console.log(chalk.gray('• Use "chainsync config set <key> <value>" to fix specific issues'));
      console.log(chalk.gray('• Check your .env file for required environment variables'));
    }

  } catch (error) {
    console.error(chalk.red('Failed to validate configuration:'), error);
  }
}