/**
 * Switchboard Deployment Repository
 *
 * Repository for deployment data operations
 */

import { RepositoryBase, DatabaseConnectionManager, PaginatedResult, PaginationOptions } from '@switchboard/services-shared';
import { Logger } from '@switchboard/services-shared';
import { MetricsCollector } from '@switchboard/services-shared';
import { IDeployment, Deployment } from '../models/deployment';

export interface DeploymentFilters {
  status?: string;
  initiatedBy?: string;
  chain?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class DeploymentRepository extends RepositoryBase<IDeployment> {
  constructor(
    connectionManager: DatabaseConnectionManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    super(Deployment, connectionManager, logger, metricsCollector);
  }

  /**
   * Create a new deployment
   */
  async createDeployment(deploymentData: {
    deploymentId: string;
    contractCode: string;
    chains: string[];
    initiatedBy: string;
    config?: any;
  }): Promise<IDeployment> {
    const deployment = {
      ...deploymentData,
      chains: deploymentData.chains.map(chain => ({
        name: chain,
        status: 'pending' as const
      })),
      metadata: {
        totalChains: deploymentData.chains.length,
        completedChains: 0,
        failedChains: 0,
        estimatedCompletionTime: new Date(Date.now() + 30000 * deploymentData.chains.length) // 30s per chain
      }
    };

    return this.create(deployment);
  }

  /**
   * Find deployments with filters
   */
  async findWithFilters(
    filters: DeploymentFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<IDeployment>> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.initiatedBy) {
      query.initiatedBy = filters.initiatedBy;
    }

    if (filters.chain) {
      query['chains.name'] = filters.chain;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    return this.findPaginated(query, {
      ...pagination,
      sort: pagination.sort || { createdAt: -1 }
    });
  }

  /**
   * Find active deployments
   */
  async findActiveDeployments(): Promise<IDeployment[]> {
    return this.find({
      status: { $in: ['pending', 'in_progress'] }
    });
  }

  /**
   * Find pending deployments for processing
   */
  async findPendingForProcessing(limit: number = 10): Promise<IDeployment[]> {
    return this.executeCustom(
      (model) => model.find({
        status: 'pending'
      }).sort({ createdAt: 1 }).limit(limit).exec(),
      'findPendingForProcessing'
    );
  }

  /**
   * Update deployment chain status
   */
  async updateChainStatus(
    deploymentId: string,
    chainName: string,
    status: 'pending' | 'deploying' | 'completed' | 'failed',
    data: {
      transactionHash?: string;
      contractAddress?: string;
      blockNumber?: number;
      gasUsed?: number;
      error?: string;
    } = {}
  ): Promise<IDeployment | null> {
    return this.executeCustom(
      async (model) => {
        const deployment = await model.findOne({ deploymentId }).exec();
        if (!deployment) {
          return null;
        }

        // Update chain status directly on the document using type assertion
        const deploymentDoc = deployment as any;
        if (!deploymentDoc.chainStatus) {
          deploymentDoc.chainStatus = {};
        }
        deploymentDoc.chainStatus[chainName] = { status, ...data };
        deploymentDoc.updatedAt = new Date();
        return deployment.save();
      },
      'updateChainStatus'
    );
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(filters: DeploymentFilters = {}): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    partial: number;
    avgCompletionTime?: number;
  }> {
    const baseQuery: any = {};

    if (filters.initiatedBy) {
      baseQuery.initiatedBy = filters.initiatedBy;
    }

    if (filters.dateFrom || filters.dateTo) {
      baseQuery.createdAt = {};
      if (filters.dateFrom) {
        baseQuery.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        baseQuery.createdAt.$lte = filters.dateTo;
      }
    }

    const pipeline = [
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgCompletionTime: {
            $avg: {
              $cond: [
                { $ne: ['$completedAt', null] },
                { $subtract: ['$completedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ];

    const results = await this.aggregate(pipeline);

    const stats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      partial: 0,
      avgCompletionTime: undefined as number | undefined
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const result of results) {
      stats.total += result.count;

      // Type-safe property assignment
      switch (result._id) {
        case 'pending':
          stats.pending = result.count;
          break;
        case 'inProgress':
          stats.inProgress = result.count;
          break;
        case 'completed':
          stats.completed = result.count;
          break;
        case 'failed':
          stats.failed = result.count;
          break;
        case 'partial':
          stats.partial = result.count;
          break;
      }

      if (result._id === 'completed' && result.avgCompletionTime) {
        totalCompletionTime += result.avgCompletionTime * result.count;
        completedCount += result.count;
      }
    }

    if (completedCount > 0) {
      stats.avgCompletionTime = Math.round(totalCompletionTime / completedCount);
    }

    return stats;
  }

  /**
   * Find deployments by chain
   */
  async findByChain(chainName: string): Promise<IDeployment[]> {
    return this.find({
      'chains.name': chainName
    });
  }

  /**
   * Find recent deployments
   */
  async findRecentDeployments(hours: number = 24, limit: number = 50): Promise<IDeployment[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.executeCustom(
      (model) => model.find({
        createdAt: { $gte: since }
      }).sort({ createdAt: -1 }).limit(limit).exec(),
      'findRecentDeployments'
    );
  }

  /**
   * Find deployments requiring attention
   */
  async findRequiringAttention(): Promise<IDeployment[]> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return this.find({
      $or: [
        // Deployments stuck in progress for too long
        {
          status: 'in_progress',
          updatedAt: { $lt: thirtyMinutesAgo }
        },
        // Deployments with failed chains
        {
          'metadata.failedChains': { $gt: 0 }
        }
      ]
    });
  }

  /**
   * Cleanup old completed deployments
   */
  async cleanupOldDeployments(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.deleteMany({
      status: { $in: ['completed', 'failed'] },
      completedAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}