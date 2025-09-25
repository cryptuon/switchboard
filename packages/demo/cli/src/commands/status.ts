import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { ChainSync } from '@chainsync/sdk';
import { loadConfig } from '../utils/config';
import { createSpinner } from '../utils/spinner';

export const statusCommand = new Command('status')
  .description('Show overall system status and health')
  .option('-v, --verbose', 'Show detailed status information')
  .option('-c, --chains', 'Show chain-specific status')
  .action(async (options) => {
    console.log(chalk.blue('📊 ChainSync System Status\n'));

    try {
      const config = await loadConfig();
      if (!config) {
        console.log(chalk.red('❌ No configuration found. Run: chainsync init'));
        return;
      }

      const spinner = createSpinner('Checking system status...');
      spinner.start();

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

      // Get system status
      const systemStatus = await chainSync.getSystemStatus();
      const deployments = await chainSync.listDeployments();

      spinner.stop();

      // Project overview
      console.log(chalk.cyan('📋 Project Overview:'));
      console.log(chalk.gray(`  Name: ${config.project.name}`));
      console.log(chalk.gray(`  Network: ${config.network}`));
      console.log(chalk.gray(`  Chains: ${config.chains.join(', ')}`));

      // Deployment summary
      console.log(chalk.cyan('\n🚀 Deployment Summary:'));
      const activeDeployments = deployments.filter(d => d.status === 'processing').length;
      const completedDeployments = deployments.filter(d => d.status === 'completed').length;
      const failedDeployments = deployments.filter(d => d.status === 'failed').length;

      console.log(chalk.gray(`  Total Deployments: ${deployments.length}`));
      console.log(chalk.gray(`  Active: ${activeDeployments}`));
      console.log(chalk.green(`  Completed: ${completedDeployments}`));
      if (failedDeployments > 0) {
        console.log(chalk.red(`  Failed: ${failedDeployments}`));
      }

      // System health
      console.log(chalk.cyan('\n💚 System Health:'));
      console.log(`  Oracle Service: ${getHealthIcon(systemStatus.oracleHealth)} ${systemStatus.oracleHealth}`);
      console.log(`  Coordinator: ${getHealthIcon(systemStatus.coordinatorHealth)} ${systemStatus.coordinatorHealth}`);
      console.log(`  SDK Connection: ${getHealthIcon(systemStatus.sdkHealth)} ${systemStatus.sdkHealth}`);

      // Chain status
      if (options.chains || options.verbose) {
        console.log(chalk.cyan('\n⛓️  Chain Status:'));

        const chainData = [];
        chainData.push(['Chain', 'Status', 'Block Height', 'Response Time', 'Last Update']);

        for (const chain of config.chains) {
          const chainStatus = systemStatus.chains[chain];
          if (chainStatus) {
            chainData.push([
              chain.charAt(0).toUpperCase() + chain.slice(1),
              getHealthIcon(chainStatus.status) + ' ' + chainStatus.status,
              chainStatus.blockHeight?.toString() || 'Unknown',
              chainStatus.responseTime ? `${chainStatus.responseTime}ms` : 'N/A',
              chainStatus.lastUpdate ? new Date(chainStatus.lastUpdate).toLocaleTimeString() : 'Never'
            ]);
          } else {
            chainData.push([
              chain.charAt(0).toUpperCase() + chain.slice(1),
              '❌ Not configured',
              'N/A',
              'N/A',
              'N/A'
            ]);
          }
        }

        console.log(table(chainData));
      }

      // Recent activity
      if (deployments.length > 0) {
        console.log(chalk.cyan('\n📈 Recent Activity:'));
        const recentDeployments = deployments.slice(0, 5);

        const activityData = [];
        activityData.push(['Time', 'Action', 'Status', 'Chains']);

        recentDeployments.forEach(deployment => {
          activityData.push([
            new Date(deployment.createdAt).toLocaleString(),
            'Deploy',
            getStatusIcon(deployment.status) + ' ' + deployment.status,
            deployment.deployments.map((d: any) => d.chain).join(', ')
          ]);
        });

        console.log(table(activityData));
      }

      // Warnings and recommendations
      const warnings = [];
      const recommendations = [];

      // Check for missing RPC URLs
      config.chains.forEach(chain => {
        if (!config.rpcs[chain]) {
          warnings.push(`Missing RPC URL for ${chain}`);
        }
      });

      // Check for failed deployments
      if (failedDeployments > 0) {
        warnings.push(`${failedDeployments} failed deployment(s) need attention`);
      }

      // Check system health
      if (systemStatus.oracleHealth !== 'healthy') {
        warnings.push('Oracle service is not healthy');
      }

      if (systemStatus.coordinatorHealth !== 'healthy') {
        warnings.push('Coordinator service is not healthy');
      }

      // Recommendations
      if (completedDeployments === 0 && deployments.length === 0) {
        recommendations.push('Start by deploying your first contract with: chainsync deploy');
      }

      if (config.chains.length === 1) {
        recommendations.push('Consider adding more chains for true cross-chain deployment');
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }

      if (recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Recommendations:'));
        recommendations.forEach(rec => {
          console.log(chalk.gray(`  • ${rec}`));
        });
      }

      // Overall status
      const overallHealthy = systemStatus.oracleHealth === 'healthy' &&
                            systemStatus.coordinatorHealth === 'healthy' &&
                            warnings.length === 0;

      console.log(chalk.cyan('\n🎯 Overall Status:'));
      if (overallHealthy) {
        console.log(chalk.green('✅ All systems operational'));
      } else {
        console.log(chalk.yellow('⚠️  Some issues detected - see warnings above'));
      }

      // Quick actions
      console.log(chalk.blue('\n🔧 Quick Actions:'));
      console.log(chalk.gray('• Deploy contract: chainsync deploy'));
      console.log(chalk.gray('• Track deployment: chainsync track <id>'));
      console.log(chalk.gray('• View analytics: chainsync analytics'));
      console.log(chalk.gray('• Update config: chainsync config'));

    } catch (error) {
      console.error(chalk.red('Failed to get system status:'), error);
    }
  });

function getHealthIcon(status: string): string {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'online':
      return '🟢';
    case 'warning':
    case 'degraded':
      return '🟡';
    case 'error':
    case 'offline':
      return '🔴';
    default:
      return '⚪';
  }
}

function getStatusIcon(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
      return '✅';
    case 'failed':
    case 'error':
      return '❌';
    case 'pending':
      return '⏳';
    case 'processing':
    case 'deploying':
      return '🔄';
    default:
      return '📋';
  }
}