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
  .option('--fix', 'Attempt to fix common issues automatically')
  .action(async (options) => {
    console.log(chalk.blue('🔍 ChainSync Validation\n'));

    try {
      if (options.config) {
        await validateConfiguration();
        return;
      }

      if (options.contract) {
        await validateContract(options.contract, options.fix);
      } else if (options.all) {
        await validateAllContracts(options.fix);
      } else {
        // Validate everything
        await validateConfiguration();
        await validateAllContracts(options.fix);
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
      console.log(chalk.yellow('💡 Run "chainsync init" to create a configuration'));
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
      const supportedChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'];
      config.chains.forEach(chain => {
        if (!supportedChains.includes(chain)) {
          issues.push({ type: 'warning', message: `Unsupported chain: ${chain}` });
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

    // Validate Solana configuration
    if (!config.solana) {
      issues.push({ type: 'error', message: 'Solana configuration missing' });
    } else {
      if (!config.solana.rpcUrl) {
        issues.push({ type: 'error', message: 'Solana RPC URL not configured' });
      }
      if (!config.solana.network) {
        issues.push({ type: 'warning', message: 'Solana network not specified' });
      }
    }

    // Validate deployment configuration
    if (config.deployment) {
      if (config.deployment.gasLimit < 21000) {
        issues.push({ type: 'warning', message: 'Gas limit may be too low for contract deployment' });
      }
      if (config.deployment.gasLimit > 10000000) {
        issues.push({ type: 'warning', message: 'Gas limit is very high - this may cause failures' });
      }
    }

    // Validate environment variables
    const requiredEnvVars = ['SOLANA_RPC_URL'];
    if (config.chains) {
      config.chains.forEach(chain => {
        requiredEnvVars.push(`${chain.toUpperCase()}_RPC_URL`);
      });
    }

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        issues.push({ type: 'warning', message: `Environment variable ${envVar} not set` });
      }
    });

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
      console.log(chalk.gray('• Update RPC URLs: chainsync config setup-rpcs'));
      console.log(chalk.gray('• Set environment variables in .env file'));
      console.log(chalk.gray('• Review configuration: chainsync config show'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Configuration validation failed'));
    throw error;
  }
}

async function validateContract(contractPath: string, fix: boolean): Promise<void> {
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
      await validateSolidityContract(contractContent, issues, fix);
    } else if (contractPath.endsWith('.bin')) {
      await validateBytecode(contractContent, issues);
    } else {
      issues.push({ type: 'error', message: 'Unsupported contract format. Use .sol or .bin files.' });
    }

    spinner.stop();

    // Report results
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');
    const info = issues.filter(i => i.type === 'info');

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

      if (info.length > 0) {
        console.log(chalk.blue('\n💡 Optimization Suggestions:'));
        info.forEach(suggestion => {
          console.log(chalk.blue(`  • ${suggestion.message}`));
        });
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('Contract validation failed'));
    throw error;
  }
}

async function validateSolidityContract(content: string, issues: Array<any>, fix: boolean): Promise<void> {
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
  } else {
    const lineIndex = lines.indexOf(pragmaLine) + 1;
    if (pragmaLine.includes('^0.4') || pragmaLine.includes('^0.5')) {
      issues.push({ type: 'warning', message: 'Consider upgrading to a newer Solidity version', line: lineIndex });
    }
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

    // Check for unchecked external calls
    if (line.includes('.call(') && !line.includes('require')) {
      issues.push({ type: 'warning', message: 'External call should be wrapped in require() or check return value', line: lineNum });
    }

    // Check for reentrancy guards
    if (line.includes('transfer(') || line.includes('send(')) {
      issues.push({ type: 'info', message: 'Consider using reentrancy guard for external transfers', line: lineNum });
    }
  });

  // Check for constructor
  const hasConstructor = content.includes('constructor(');
  if (!hasConstructor && content.includes('contract ')) {
    issues.push({ type: 'info', message: 'Consider adding a constructor for initialization' });
  }

  // Check for events
  const hasEvents = content.includes('event ');
  if (!hasEvents) {
    issues.push({ type: 'info', message: 'Consider adding events for better transparency' });
  }

  // Check contract size (rough estimate)
  if (content.length > 50000) {
    issues.push({ type: 'warning', message: 'Contract is very large, may hit bytecode size limit' });
  }
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

  // Check if it looks like compiled bytecode
  const hasConstructor = bytecode.includes('608060405234801561001057600080fd5b50');
  if (!hasConstructor) {
    issues.push({ type: 'info', message: 'Bytecode may not include standard constructor pattern' });
  }
}

async function validateAllContracts(fix: boolean): Promise<void> {
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
    await validateContract(contractPath, fix);
    console.log(''); // Add spacing between contracts
  }

  console.log(chalk.blue('🎯 Validation Summary:'));
  console.log(chalk.gray(`• Validated ${contractFiles.length} contract(s)`));
  console.log(chalk.gray('• Review any issues above before deployment'));
  console.log(chalk.gray('• Use "chainsync deploy" when ready'));
}