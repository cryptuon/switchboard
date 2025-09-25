import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import fs from 'fs';
import path from 'path';
import { ChainSync } from '@chainsync/sdk';
import { createSpinner } from '../utils/spinner';

export const analyticsCommand = new Command('analytics')
  .description('View deployment analytics and insights')
  .option('-p, --period <period>', 'Time period (7d, 30d, 90d)', '30d')
  .option('-c, --chain <chain>', 'Filter by specific chain')
  .option('--export <format>', 'Export data (json, csv)')
  .action(async (options) => {
    console.log(chalk.blue('📊 ChainSync Analytics Dashboard\n'));

    try {
      const spinner = createSpinner('Generating analytics...');
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

      // Get analytics data
      const analytics = await chainSync.getAnalytics({
        period: options.period,
        chain: options.chain
      });

      spinner.stop();

      // Summary metrics
      console.log(chalk.cyan('📈 Summary Metrics:'));
      console.log(chalk.gray(`  Period: ${options.period}`));
      if (options.chain) {
        console.log(chalk.gray(`  Chain: ${options.chain}`));
      }
      console.log(chalk.gray(`  Total Deployments: ${analytics.totalDeployments}`));
      console.log(chalk.gray(`  Success Rate: ${analytics.successRate.toFixed(1)}%`));
      console.log(chalk.gray(`  Average Deploy Time: ${analytics.averageDeployTime}s`));
      console.log(chalk.gray(`  Total Gas Used: ${analytics.totalGasUsed.toLocaleString()}`));

      // Chain performance
      console.log(chalk.cyan('\n⛓️  Chain Performance:'));

      const chainData = [];
      chainData.push(['Chain', 'Deployments', 'Success Rate', 'Avg Time', 'Gas Used', 'Fees']);

      Object.entries(analytics.chainMetrics).forEach(([chain, metrics]: [string, any]) => {
        chainData.push([
          chain.charAt(0).toUpperCase() + chain.slice(1),
          metrics.deployments.toString(),
          `${metrics.successRate.toFixed(1)}%`,
          `${metrics.averageTime}s`,
          metrics.gasUsed.toLocaleString(),
          `${metrics.totalFees.toFixed(4)} ETH`
        ]);
      });

      console.log(table(chainData));

      // Deployment trends
      if (analytics.trends && analytics.trends.length > 0) {
        console.log(chalk.cyan('\n📅 Deployment Trends:'));

        const trendData = [];
        trendData.push(['Date', 'Deployments', 'Success %', 'Gas Used']);

        analytics.trends.slice(-7).forEach((trend: any) => {
          trendData.push([
            new Date(trend.date).toLocaleDateString(),
            trend.deployments.toString(),
            `${trend.successRate.toFixed(1)}%`,
            trend.gasUsed.toLocaleString()
          ]);
        });

        console.log(table(trendData));
      }

      // Error analysis
      if (analytics.errors && analytics.errors.length > 0) {
        console.log(chalk.cyan('\n❌ Common Errors:'));

        const errorData = [];
        errorData.push(['Error Type', 'Occurrences', 'Affected Chains', 'Last Seen']);

        analytics.errors.slice(0, 5).forEach((error: any) => {
          errorData.push([
            error.type,
            error.count.toString(),
            error.chains.join(', '),
            new Date(error.lastSeen).toLocaleDateString()
          ]);
        });

        console.log(table(errorData));
      }

      // Cost analysis
      console.log(chalk.cyan('\n💰 Cost Analysis:'));
      console.log(chalk.gray(`  Total Fees Paid: ${analytics.totalFees.toFixed(6)} ETH`));
      console.log(chalk.gray(`  Average Fee per Deployment: ${analytics.averageFeePerDeployment.toFixed(6)} ETH`));
      console.log(chalk.gray(`  Most Expensive Chain: ${analytics.mostExpensiveChain.name} (${analytics.mostExpensiveChain.averageFee.toFixed(6)} ETH)`));
      console.log(chalk.gray(`  Most Economical Chain: ${analytics.mostEconomicalChain.name} (${analytics.mostEconomicalChain.averageFee.toFixed(6)} ETH)`));

      // Performance insights
      console.log(chalk.cyan('\n🎯 Performance Insights:'));

      const insights = generateInsights(analytics);
      insights.forEach(insight => {
        console.log(chalk.blue(`  • ${insight}`));
      });

      // Recommendations
      console.log(chalk.cyan('\n💡 Recommendations:'));

      const recommendations = generateRecommendations(analytics);
      recommendations.forEach(rec => {
        console.log(chalk.yellow(`  • ${rec}`));
      });

      // Export data if requested
      if (options.export) {
        await exportAnalytics(analytics, options.export);
      }

      // Show detailed charts in verbose mode
      if (analytics.totalDeployments > 0) {
        console.log(chalk.blue('\n🔧 Quick Actions:'));
        console.log(chalk.gray('• View specific deployment: chainsync track <id>'));
        console.log(chalk.gray('• Check system status: chainsync status'));
        console.log(chalk.gray('• Export data: chainsync analytics --export json'));
      }

    } catch (error) {
      console.error(chalk.red('Failed to generate analytics:'), error);
    }
  });

function generateInsights(analytics: any): string[] {
  const insights: string[] = [];

  if (analytics.successRate > 95) {
    insights.push('Excellent deployment success rate! Your configuration is well-optimized.');
  } else if (analytics.successRate < 80) {
    insights.push('Low success rate detected. Consider reviewing RPC configurations and gas settings.');
  }

  if (analytics.averageDeployTime > 120) {
    insights.push('Deployments are taking longer than average. Check network congestion.');
  } else if (analytics.averageDeployTime < 30) {
    insights.push('Fast deployment times! Your setup is performing well.');
  }

  // Find the best performing chain
  const bestChain = Object.entries(analytics.chainMetrics)
    .sort(([,a]: [string, any], [,b]: [string, any]) => b.successRate - a.successRate)[0];

  if (bestChain) {
    insights.push(`${bestChain[0]} has the highest success rate at ${(bestChain[1] as any).successRate.toFixed(1)}%.`);
  }

  // Gas usage insights
  if (analytics.totalGasUsed > 1000000) {
    insights.push('High gas usage detected. Consider optimizing contract bytecode.');
  }

  return insights;
}

function generateRecommendations(analytics: any): string[] {
  const recommendations: string[] = [];

  if (analytics.successRate < 90) {
    recommendations.push('Improve success rate by updating RPC URLs and increasing gas limits.');
  }

  if (analytics.averageDeployTime > 180) {
    recommendations.push('Consider using faster RPC providers or increasing gas prices during peak hours.');
  }

  // Check for chains with low performance
  Object.entries(analytics.chainMetrics).forEach(([chain, metrics]: [string, any]) => {
    if (metrics.successRate < 80) {
      recommendations.push(`Review ${chain} configuration - success rate is below 80%.`);
    }
  });

  if (analytics.totalFees > 0.1) {
    recommendations.push('Monitor gas prices and deploy during off-peak hours to reduce costs.');
  }

  if (Object.keys(analytics.chainMetrics).length === 1) {
    recommendations.push('Consider deploying to multiple chains to take advantage of cross-chain features.');
  }

  return recommendations;
}

async function exportAnalytics(analytics: any, format: string): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `chainsync-analytics-${timestamp}.${format}`;

  try {
    if (format === 'json') {
      fs.writeFileSync(filename, JSON.stringify(analytics, null, 2));
    } else if (format === 'csv') {
      const csv = convertToCSV(analytics);
      fs.writeFileSync(filename, csv);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    console.log(chalk.green(`\n📁 Analytics exported to: ${path.resolve(filename)}`));
  } catch (error) {
    console.error(chalk.red('Failed to export analytics:'), error);
  }
}

function convertToCSV(analytics: any): string {
  const headers = ['Chain', 'Deployments', 'Success Rate', 'Average Time', 'Gas Used', 'Total Fees'];
  const rows = [headers.join(',')];

  Object.entries(analytics.chainMetrics).forEach(([chain, metrics]: [string, any]) => {
    const row = [
      chain,
      metrics.deployments,
      metrics.successRate.toFixed(2),
      metrics.averageTime,
      metrics.gasUsed,
      metrics.totalFees.toFixed(6)
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}