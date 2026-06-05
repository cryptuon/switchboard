#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { deployCommand } from './commands/deploy-simple';
import { configCommand } from './commands/config-simple';
import { initCommand } from './commands/init-simple';
import { statusCommand } from './commands/status-simple';
import { validateCommand } from './commands/validate-simple';
import { networksCommand } from './commands/networks';

const program = new Command();

// CLI Header
console.log(chalk.cyan(`
  ╔═══════════════════════════════════════╗
  ║              Switchboard CLI            ║
  ║    Cross-Chain Development Made Easy  ║
  ╚═══════════════════════════════════════╝
`));

program
  .name('switchboard')
  .description('Switchboard CLI - Unified cross-chain development toolkit')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-c, --config <path>', 'Specify config file path', '.switchboard.yaml');

// Commands
program
  .addCommand(initCommand)
  .addCommand(configCommand)
  .addCommand(deployCommand)
  .addCommand(statusCommand)
  .addCommand(validateCommand)
  .addCommand(networksCommand);

// Global error handler
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  if (error instanceof Error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}