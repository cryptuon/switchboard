import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../utils/config';
import { createSpinner } from '../utils/spinner';

export const validateCommand = new Command('validate')
  .description('Validate contracts and configuration')
  .option('-c, --contract <path>', 'Path to contract file to validate')
  .option('-a, --all', 'Validate all contracts in contracts/ directory')
  .option('--config', 'Validate configuration only')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Switchboard Validation\n'));

    try {
      if (options.config) {
        await validateConfiguration();
        return;
      }

      if (options.contract) {
        await validateContract(options.contract);
      } else if (options.all) {
        await validateAllContracts();
      } else {
        // Validate everything
        await validateConfiguration();
        await validateAllContracts();
      }

    } catch (error) {
      console.error(chalk.red('Validation failed:'), error);
    }
  });

async function validateConfiguration(): Promise<void> {
  console.log(chalk.cyan('📋 Configuration Validation\n'));

  const spinner = createSpinner('Validating configuration...');
  spinner.start();

  try {
    const config = await loadConfig();
    if (!config) {
      spinner.fail(chalk.red('No configuration found'));
      console.log(chalk.yellow('💡 Run "switchboard init" to create a configuration'));
      return;
    }

    const issues: Array<{ type: 'error' | 'warning'; message: string }> = [];

    // Validate project configuration
    if (!config.project) {
      issues.push({ type: 'error', message: 'Missing project configuration' });
    } else {
      if (!config.project.name) {
        issues.push({ type: 'error', message: 'Project name is required' });
      }
      if (!config.project.version) {
        issues.push({ type: 'warning', message: 'Project version not specified' });
      }
    }

    // Validate chains
    if (!config.chains || config.chains.length === 0) {
      issues.push({ type: 'error', message: 'No chains configured' });
    } else {
      const supportedChains = [
        // EVM Chains
        'ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'fantom',
        // Layer 2 Solutions
        'base', 'zksync', 'polygonzkevm', 'linea', 'mantle', 'scroll',
        // Alternative Layer 1s
        'near', 'cosmos', 'terra', 'sui', 'aptos',
        // Emerging Networks
        'celestia', 'starknet', 'flow', 'heco', 'kroma', 'celo', 'gnosis', 'moonbeam', 'harmony',
        // Additional Networks
        'cronos', 'aurora', 'evmos', 'kava', 'klaytn', 'oasis', 'telos', 'fuse', 'moonriver',
        'milkomeda', 'metis', 'boba', 'syscoin', 'velas', 'elastos', 'iotex',
        // Testnets
        'goerli', 'sepolia', 'mumbai', 'fuji'
      ];
      config.chains.forEach(chain => {
        if (!supportedChains.includes(chain)) {
          issues.push({ type: 'warning', message: `Chain '${chain}' may not be fully supported yet` });
        }
      });
    }

    // Validate network
    if (!config.network) {
      issues.push({ type: 'error', message: 'Network not specified' });
    } else if (!['mainnet', 'testnet'].includes(config.network)) {
      issues.push({ type: 'error', message: 'Network must be "mainnet" or "testnet"' });
    }

    // Validate RPC URLs
    if (config.chains) {
      config.chains.forEach(chain => {
        const rpcUrl = config.rpcs?.[chain];
        if (!rpcUrl) {
          issues.push({ type: 'warning', message: `No RPC URL configured for ${chain}` });
        } else {
          if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
            issues.push({ type: 'error', message: `Invalid RPC URL for ${chain}: must start with http:// or https://` });
          }
          if (rpcUrl.includes('YOUR_KEY')) {
            issues.push({ type: 'warning', message: `RPC URL for ${chain} contains placeholder "YOUR_KEY"` });
          }
        }
      });
    }

    spinner.stop();

    // Report results
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');

    if (errors.length === 0 && warnings.length === 0) {
      console.log(chalk.green('✅ Configuration is valid!'));
    } else {
      if (errors.length > 0) {
        console.log(chalk.red('❌ Configuration Errors:'));
        errors.forEach(error => {
          console.log(chalk.red(`  • ${error.message}`));
        });
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Configuration Warnings:'));
        warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning.message}`));
        });
      }

      console.log(chalk.blue('\n💡 Quick Fixes:'));
      console.log(chalk.gray('• Set environment variables in .env file'));
      console.log(chalk.gray('• Review configuration: switchboard config show'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Configuration validation failed'));
    throw error;
  }
}

async function validateContract(contractPath: string): Promise<void> {
  console.log(chalk.cyan(`🔍 Validating Contract: ${contractPath}\n`));

  if (!fs.existsSync(contractPath)) {
    console.log(chalk.red(`❌ Contract file not found: ${contractPath}`));
    return;
  }

  const spinner = createSpinner('Analyzing contract...');
  spinner.start();

  try {
    const contractContent = fs.readFileSync(contractPath, 'utf8');
    const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; line?: number }> = [];

    // Basic syntax checks
    if (contractPath.endsWith('.sol')) {
      await validateSolidityContract(contractContent, issues);
    } else if (contractPath.endsWith('.bin')) {
      await validateBytecode(contractContent, issues);
    } else {
      issues.push({ type: 'error', message: 'Unsupported contract format. Use .sol or .bin files.' });
    }

    spinner.stop();

    // Report results
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');

    if (errors.length === 0 && warnings.length === 0) {
      console.log(chalk.green(`✅ Contract is valid: ${path.basename(contractPath)}`));
    } else {
      if (errors.length > 0) {
        console.log(chalk.red('❌ Contract Errors:'));
        errors.forEach(error => {
          const location = error.line ? ` (line ${error.line})` : '';
          console.log(chalk.red(`  • ${error.message}${location}`));
        });
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Contract Warnings:'));
        warnings.forEach(warning => {
          const location = warning.line ? ` (line ${warning.line})` : '';
          console.log(chalk.yellow(`  • ${warning.message}${location}`));
        });
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('Contract validation failed'));
    throw error;
  }
}

async function validateSolidityContract(content: string, issues: Array<any>): Promise<void> {
  const lines = content.split('\n');

  // Check for SPDX license
  const hasSPDX = lines.some(line => line.includes('SPDX-License-Identifier'));
  if (!hasSPDX) {
    issues.push({ type: 'warning', message: 'Missing SPDX license identifier' });
  }

  // Check pragma version
  const pragmaLine = lines.find(line => line.trim().startsWith('pragma solidity'));
  if (!pragmaLine) {
    issues.push({ type: 'error', message: 'Missing pragma solidity statement' });
  }

  // Check for common security issues
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for tx.origin usage
    if (line.includes('tx.origin')) {
      issues.push({ type: 'warning', message: 'Using tx.origin can be unsafe, consider using msg.sender', line: lineNum });
    }

    // Check for block.timestamp dependencies
    if (line.includes('block.timestamp') || line.includes('now')) {
      issues.push({ type: 'info', message: 'Consider timestamp manipulation risks', line: lineNum });
    }
  });
}

async function validateBytecode(content: string, issues: Array<any>): Promise<void> {
  const bytecode = content.trim();

  // Check if it's valid hex
  if (!bytecode.startsWith('0x')) {
    issues.push({ type: 'error', message: 'Bytecode must start with 0x' });
  }

  // Check if it's valid hex characters
  const hexPattern = /^0x[0-9a-fA-F]*$/;
  if (!hexPattern.test(bytecode)) {
    issues.push({ type: 'error', message: 'Bytecode contains invalid hexadecimal characters' });
  }

  // Check minimum size
  if (bytecode.length < 10) {
    issues.push({ type: 'error', message: 'Bytecode appears to be too short' });
  }

  // Check maximum size (24KB limit)
  if (bytecode.length > 49152) { // 24KB * 2 (hex chars)
    issues.push({ type: 'error', message: 'Bytecode exceeds 24KB size limit' });
  }
}

async function validateAllContracts(): Promise<void> {
  console.log(chalk.cyan('📁 Validating All Contracts\n'));

  const contractsDir = 'contracts';
  if (!fs.existsSync(contractsDir)) {
    console.log(chalk.yellow('⚠️  No contracts directory found'));
    console.log(chalk.gray('💡 Create contracts/ directory and add your .sol files'));
    return;
  }

  const files = fs.readdirSync(contractsDir);
  const contractFiles = files.filter(file => file.endsWith('.sol') || file.endsWith('.bin'));

  if (contractFiles.length === 0) {
    console.log(chalk.yellow('⚠️  No contract files found in contracts/'));
    return;
  }

  console.log(chalk.blue(`Found ${contractFiles.length} contract(s) to validate:\n`));

  for (const file of contractFiles) {
    const contractPath = path.join(contractsDir, file);
    await validateContract(contractPath);
    console.log(''); // Add spacing between contracts
  }

  console.log(chalk.blue('🎯 Validation Summary:'));
  console.log(chalk.gray(`• Validated ${contractFiles.length} contract(s)`));
  console.log(chalk.gray('• Review any issues above before deployment'));
  console.log(chalk.gray('• Use "switchboard deploy" when ready'));
}