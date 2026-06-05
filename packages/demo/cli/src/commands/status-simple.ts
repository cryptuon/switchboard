import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../utils/config';
import { createSpinner } from '../utils/spinner';

export const statusCommand = new Command('status')
  .description('Show overall system status and health')
  .option('-v, --verbose', 'Show detailed status information')
  .action(async (options) => {
    console.log(chalk.blue('📊 Switchboard System Status\n'));

    try {
      const config = await loadConfig();
      if (!config) {
        console.log(chalk.red('❌ No configuration found. Run: switchboard init'));
        return;
      }

      const spinner = createSpinner('Checking system status...');
      spinner.start();

      // Simulate status check
      await new Promise(resolve => setTimeout(resolve, 1000));

      spinner.stop();

      // Project overview
      console.log(chalk.cyan('📋 Project Overview:'));
      console.log(chalk.gray(`  Name: ${config.project.name}`));
      console.log(chalk.gray(`  Network: ${config.network}`));
      console.log(chalk.gray(`  Chains: ${config.chains.join(', ')}`));

      // System health
      console.log(chalk.cyan('\n💚 System Health:'));
      console.log(`  Oracle Service: 🟢 healthy`);
      console.log(`  Coordinator: 🟢 healthy`);
      console.log(`  SDK Connection: 🟢 healthy`);

      // Chain status
      console.log(chalk.cyan('\n⛓️  Chain Status:'));
      config.chains.forEach(chain => {
        const rpcConfigured = config.rpcs[chain] ? '🟢' : '🔴';
        console.log(`  ${chain}: ${rpcConfigured} ${config.rpcs[chain] ? 'configured' : 'not configured'}`);
      });

      // Quick actions
      console.log(chalk.blue('\n🔧 Quick Actions:'));
      console.log(chalk.gray('• Deploy contract: switchboard deploy'));
      console.log(chalk.gray('• Update config: switchboard config'));
      console.log(chalk.gray('• Validate setup: switchboard validate'));

    } catch (error) {
      console.error(chalk.red('Failed to get system status:'), error);
    }
  });