import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { ChainSync } from '@chainsync/sdk';
import { createSpinner } from '../utils/spinner';

export const trackCommand = new Command('track')
  .description('Track deployment status and transaction progress')
  .argument('[deploymentId]', 'Deployment ID to track')
  .option('-w, --watch', 'Watch for real-time updates')
  .option('-i, --interval <seconds>', 'Update interval for watch mode', '10')
  .option('-v, --verbose', 'Show detailed transaction information')
  .action(async (deploymentId, options) => {
    console.log(chalk.blue('🔍 Tracking deployment status...\n'));

    try {
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

      if (!deploymentId) {
        // Show all recent deployments
        await showAllDeployments(chainSync);
        return;
      }

      if (options.watch) {
        await watchDeployment(chainSync, deploymentId, parseInt(options.interval), options.verbose);
      } else {
        await showDeploymentStatus(chainSync, deploymentId, options.verbose);
      }

    } catch (error) {
      console.error(chalk.red('Failed to track deployment:'), error);
    }
  });

async function showAllDeployments(chainSync: ChainSync): Promise<void> {
  const spinner = createSpinner('Fetching recent deployments...');
  spinner.start();

  try {
    const deployments = await chainSync.listDeployments();
    spinner.stop();

    if (deployments.length === 0) {
      console.log(chalk.yellow('No deployments found.'));
      return;
    }

    console.log(chalk.blue('📋 Recent Deployments:\n'));

    const tableData = [
      ['ID', 'Status', 'Chains', 'Created', 'Success Rate']
    ];

    deployments.slice(0, 10).forEach(deployment => {
      const successCount = deployment.deployments.filter((d: any) => d.status === 'completed').length;
      const totalCount = deployment.deployments.length;
      const successRate = totalCount > 0 ? `${Math.round((successCount / totalCount) * 100)}%` : '0%';

      tableData.push([
        deployment.id.substring(0, 12) + '...',
        getStatusIcon(deployment.status) + ' ' + deployment.status,
        deployment.deployments.map((d: any) => d.chain).join(', '),
        new Date(deployment.createdAt).toLocaleDateString(),
        successRate
      ]);
    });

    console.log(table(tableData, {
      header: {
        alignment: 'center',
        content: chalk.blue('Recent Cross-Chain Deployments')
      }
    }));

    console.log(chalk.gray('\n💡 Use "chainsync track <deployment-id>" for detailed status'));

  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function showDeploymentStatus(chainSync: ChainSync, deploymentId: string, verbose: boolean): Promise<void> {
  const spinner = createSpinner('Fetching deployment status...');
  spinner.start();

  try {
    const status = await chainSync.getDeploymentStatus(deploymentId);
    spinner.stop();

    console.log(chalk.blue(`📊 Deployment Status: ${deploymentId}\n`));

    // Overall status
    console.log(chalk.cyan('Overall Status:'));
    console.log(`${getStatusIcon(status.status)} ${status.status.toUpperCase()}`);
    console.log(chalk.gray(`Created: ${new Date(status.createdAt).toLocaleString()}`));
    console.log(chalk.gray(`Last Updated: ${new Date(status.updatedAt).toLocaleString()}`));

    if (status.estimatedFee) {
      console.log(chalk.gray(`Estimated Fee: ${status.estimatedFee} tokens`));
    }

    // Chain-specific deployments
    console.log(chalk.blue('\n🔗 Chain Deployments:'));

    const tableData = [
      ['Chain', 'Status', 'Transaction Hash', 'Block', 'Gas Used']
    ];

    status.deployments.forEach((deployment: any) => {
      tableData.push([
        deployment.chain.charAt(0).toUpperCase() + deployment.chain.slice(1),
        getStatusIcon(deployment.status) + ' ' + deployment.status,
        deployment.transactionHash ?
          (verbose ? deployment.transactionHash : deployment.transactionHash.substring(0, 12) + '...') :
          'Pending',
        deployment.blockNumber || 'Pending',
        deployment.gasUsed || 'N/A'
      ]);
    });

    console.log(table(tableData));

    // Error details if any
    const errors = status.deployments.filter((d: any) => d.error);
    if (errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      errors.forEach((deployment: any) => {
        console.log(chalk.red(`${deployment.chain}: ${deployment.error}`));
      });
    }

    // Success summary
    const successCount = status.deployments.filter((d: any) => d.status === 'completed').length;
    const totalCount = status.deployments.length;

    if (successCount === totalCount) {
      console.log(chalk.green(`\n✅ All deployments completed successfully! (${successCount}/${totalCount})`));
    } else if (successCount > 0) {
      console.log(chalk.yellow(`\n⚠️  Partial success: ${successCount}/${totalCount} deployments completed`));
    } else {
      console.log(chalk.red(`\n❌ No successful deployments yet (${successCount}/${totalCount})`));
    }

    // Next steps
    if (status.status === 'pending' || status.status === 'processing') {
      console.log(chalk.blue('\n💡 Tips:'));
      console.log(chalk.gray('• Use --watch to monitor real-time updates'));
      console.log(chalk.gray('• Check network status if deployments are slow'));
    }

  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function watchDeployment(chainSync: ChainSync, deploymentId: string, interval: number, verbose: boolean): Promise<void> {
  console.log(chalk.blue(`👀 Watching deployment ${deploymentId} (updating every ${interval}s)`));
  console.log(chalk.gray('Press Ctrl+C to stop watching\n'));

  let lastStatus = '';
  const startTime = Date.now();

  const watchInterval = setInterval(async () => {
    try {
      const status = await chainSync.getDeploymentStatus(deploymentId);

      // Clear previous output
      process.stdout.write('\x1b[2J\x1b[0f');

      // Show elapsed time
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(chalk.gray(`⏱️  Watching for ${elapsed}s | Last update: ${new Date().toLocaleTimeString()}\n`));

      await showDeploymentStatus(chainSync, deploymentId, verbose);

      // Check if deployment is complete
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(watchInterval);
        console.log(chalk.green('\n✅ Deployment monitoring complete!'));

        if (status.status === 'completed') {
          console.log(chalk.blue('\n🎉 All deployments successful!'));
          console.log(chalk.gray('• View analytics: chainsync analytics'));
          console.log(chalk.gray('• Check contracts: chainsync status'));
        }
      }

      lastStatus = status.status;

    } catch (error) {
      console.error(chalk.red('Error while watching:'), error);
      clearInterval(watchInterval);
    }
  }, interval * 1000);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(watchInterval);
    console.log(chalk.yellow('\n\n👋 Stopped watching deployment'));
    process.exit(0);
  });
}

function getStatusIcon(status: string): string {
  switch (status.toLowerCase()) {
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