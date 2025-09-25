/**
 * ChainSync Transaction Repository
 *
 * Repository for transaction data operations
 */

import { RepositoryBase, DatabaseConnectionManager, PaginatedResult, PaginationOptions } from '@chainsync/services-shared';
import { Logger } from '@chainsync/services-shared';
import { MetricsCollector } from '@chainsync/services-shared';
import { ITransaction, Transaction } from '../models/transaction';

export interface TransactionFilters {
  status?: string;
  chain?: string;
  deploymentId?: string;
  fromAddress?: string;
  toAddress?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class TransactionRepository extends RepositoryBase<ITransaction> {
  constructor(
    connectionManager: DatabaseConnectionManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    super(Transaction, connectionManager, logger, metricsCollector);
  }

  /**
   * Create a new transaction record
   */
  async createTransaction(transactionData: {
    transactionId: string;
    deploymentId?: string;
    chain: string;
    transactionHash: string;
    fromAddress?: string;
    toAddress?: string;
    value?: string;
    data?: string;
    gasPrice?: string;
    requiredConfirmations?: number;
    metadata?: any;
  }): Promise<ITransaction> {
    return this.create({
      ...transactionData,
      confirmations: 0,
      requiredConfirmations: transactionData.requiredConfirmations || 2
    });
  }

  /**
   * Find transactions with filters
   */
  async findWithFilters(
    filters: TransactionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<ITransaction>> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.chain) {
      query.chain = filters.chain;
    }

    if (filters.deploymentId) {
      query.deploymentId = filters.deploymentId;
    }

    if (filters.fromAddress) {
      query.fromAddress = filters.fromAddress;
    }

    if (filters.toAddress) {
      query.toAddress = filters.toAddress;
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
   * Find pending transactions for monitoring
   */
  async findPendingTransactions(chain?: string): Promise<ITransaction[]> {
    const query: any = { status: 'pending' };
    if (chain) {
      query.chain = chain;
    }
    return this.find(query);
  }

  /**
   * Find unconfirmed transactions
   */
  async findUnconfirmedTransactions(chain?: string): Promise<ITransaction[]> {
    return this.executeCustom(
      (model) => {
        const query: any = {
          status: 'pending',
          $expr: { $lt: ['$confirmations', '$requiredConfirmations'] }
        };
        if (chain) {
          query.chain = chain;
        }
        return model.find(query).sort({ createdAt: 1 }).exec();
      },
      'findUnconfirmedTransactions'
    );
  }

  /**
   * Update transaction confirmations
   */
  async updateConfirmations(
    transactionHash: string,
    confirmations: number,
    blockNumber?: number,
    blockHash?: string
  ): Promise<ITransaction | null> {
    return this.executeCustom(
      async (model) => {
        const transaction = await model.findOne({ transactionHash }).exec();
        if (!transaction) {
          return null;
        }

        // Update confirmations directly
        transaction.confirmations = confirmations;
        transaction.blockNumber = blockNumber;
        if (blockHash) {
          transaction.blockHash = blockHash;
        }
        transaction.updatedAt = new Date();

        return transaction.save();
      },
      'updateConfirmations'
    );
  }

  /**
   * Mark transaction as failed
   */
  async markAsFailed(transactionHash: string, error: string): Promise<ITransaction | null> {
    return this.executeCustom(
      async (model) => {
        const transaction = await model.findOne({ transactionHash }).exec();
        if (!transaction) {
          return null;
        }

        // Mark as failed directly
        transaction.status = 'failed';
        transaction.error = error;
        transaction.updatedAt = new Date();
        return transaction.save();
      },
      'markAsFailed'
    );
  }

  /**
   * Mark transaction as dropped
   */
  async markAsDropped(transactionHash: string): Promise<ITransaction | null> {
    return this.executeCustom(
      async (model) => {
        const transaction = await model.findOne({ transactionHash }).exec();
        if (!transaction) {
          return null;
        }

        // Mark as dropped directly
        transaction.status = 'dropped';
        transaction.updatedAt = new Date();
        return transaction.save();
      },
      'markAsDropped'
    );
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(filters: TransactionFilters = {}): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    dropped: number;
    avgConfirmationTime?: number;
  }> {
    const baseQuery: any = {};

    if (filters.chain) {
      baseQuery.chain = filters.chain;
    }

    if (filters.deploymentId) {
      baseQuery.deploymentId = filters.deploymentId;
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
          avgConfirmationTime: {
            $avg: {
              $cond: [
                { $ne: ['$confirmedAt', null] },
                { $subtract: ['$confirmedAt', '$createdAt'] },
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
      confirmed: 0,
      failed: 0,
      dropped: 0,
      avgConfirmationTime: undefined as number | undefined
    };

    let totalConfirmationTime = 0;
    let confirmedCount = 0;

    for (const result of results) {
      stats.total += result.count;

      // Type-safe property assignment
      switch (result._id) {
        case 'pending':
          stats.pending = result.count;
          break;
        case 'confirmed':
          stats.confirmed = result.count;
          break;
        case 'failed':
          stats.failed = result.count;
          break;
        case 'dropped':
          stats.dropped = result.count;
          break;
      }

      if (result._id === 'confirmed' && result.avgConfirmationTime) {
        totalConfirmationTime += result.avgConfirmationTime * result.count;
        confirmedCount += result.count;
      }
    }

    if (confirmedCount > 0) {
      stats.avgConfirmationTime = Math.round(totalConfirmationTime / confirmedCount);
    }

    return stats;
  }

  /**
   * Find transactions by deployment
   */
  async findByDeployment(deploymentId: string): Promise<ITransaction[]> {
    return this.find({ deploymentId });
  }

  /**
   * Find stale transactions (pending for too long)
   */
  async findStaleTransactions(maxAgeMinutes: number = 60): Promise<ITransaction[]> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    return this.find({
      status: 'pending',
      createdAt: { $lt: cutoffTime }
    });
  }

  /**
   * Get recent transaction activity
   */
  async getRecentActivity(hours: number = 24): Promise<{
    byChain: { [chain: string]: number };
    byStatus: { [status: string]: number };
    totalVolume: string;
    totalFees: string;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          byChain: {
            $push: {
              chain: '$chain',
              count: 1
            }
          },
          byStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          },
          totalVolume: {
            $sum: { $toDouble: { $ifNull: ['$value', '0'] } }
          },
          totalFees: {
            $sum: { $toDouble: { $ifNull: ['$fee', '0'] } }
          }
        }
      }
    ];

    const [result] = await this.aggregate(pipeline);

    if (!result) {
      return {
        byChain: {},
        byStatus: {},
        totalVolume: '0',
        totalFees: '0'
      };
    }

    // Process byChain and byStatus arrays
    const byChain: { [chain: string]: number } = {};
    const byStatus: { [status: string]: number } = {};

    result.byChain.forEach((item: any) => {
      byChain[item.chain] = (byChain[item.chain] || 0) + 1;
    });

    result.byStatus.forEach((item: any) => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    });

    return {
      byChain,
      byStatus,
      totalVolume: result.totalVolume.toString(),
      totalFees: result.totalFees.toString()
    };
  }

  /**
   * Cleanup old transactions
   */
  async cleanupOldTransactions(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.deleteMany({
      status: { $in: ['confirmed', 'failed', 'dropped'] },
      $or: [
        { confirmedAt: { $lt: cutoffDate } },
        { createdAt: { $lt: cutoffDate } }
      ]
    });

    return result.deletedCount;
  }
}