/**
 * ChainSync Deployment Repository
 *
 * Repository for managing deployment entities in primary storage
 */

import { Logger } from '../../logging/logger';
import { MetricsCollector } from '../../metrics/metrics-collector';
import { StorageManager } from '../storage-manager';
import { BaseRepository, RepositoryOptions } from './base-repository';

export interface Deployment {
  id: string;
  userId: string;
  name: string;
  chainId: number;
  contractAddress: string;
  contractABI: any;
  status: 'pending' | 'active' | 'paused' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class DeploymentRepository extends BaseRepository<Deployment> {
  constructor(
    storageManager: StorageManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    super('deployments', storageManager, logger, metricsCollector);
  }

  /**
   * Find deployments by user ID
   */
  async findByUserId(userId: string, options: RepositoryOptions = {}): Promise<Deployment[]> {
    const cacheKey = this.buildCacheKey('findByUserId', { userId });

    return this.findWithCache(
      cacheKey,
      () => this.find({ userId }, options),
      300 // 5 minutes cache
    );
  }

  /**
   * Find deployments by chain ID
   */
  async findByChainId(chainId: number, options: RepositoryOptions = {}): Promise<Deployment[]> {
    const cacheKey = this.buildCacheKey('findByChainId', { chainId });

    return this.findWithCache(
      cacheKey,
      () => this.find({ chainId }, options),
      600 // 10 minutes cache
    );
  }

  /**
   * Find active deployments
   */
  async findActive(options: RepositoryOptions = {}): Promise<Deployment[]> {
    return this.find({ status: 'active' }, options);
  }

  /**
   * Find deployment by contract address
   */
  async findByContractAddress(contractAddress: string, options: RepositoryOptions = {}): Promise<Deployment | null> {
    const cacheKey = this.buildCacheKey('findByContractAddress', { contractAddress });

    return this.findWithCache(
      cacheKey,
      async () => {
        const results = await this.find({ contractAddress }, options);
        return results.length > 0 ? results[0] : null;
      },
      1800 // 30 minutes cache (contract addresses don't change)
    );
  }

  /**
   * Update deployment status
   */
  async updateStatus(id: string, status: Deployment['status'], options: RepositoryOptions = {}): Promise<Deployment | null> {
    const result = await this.updateById(
      id,
      { status, updatedAt: new Date() },
      options
    );

    // Invalidate related caches
    await this.deleteFromCache(`${this.entityName}:findById:*`);

    return result;
  }

  /**
   * Get deployment statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byChain: Record<number, number>;
  }> {
    const cacheKey = this.buildCacheKey('getStatistics', {});

    return this.findWithCache(
      cacheKey,
      async () => {
        // Use aggregation pipeline for statistics
        const statusStats = await this.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

        const chainStats = await this.aggregate([
          {
            $group: {
              _id: '$chainId',
              count: { $sum: 1 }
            }
          }
        ]);

        const total = await this.count();

        return {
          total,
          byStatus: statusStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          byChain: chainStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        };
      },
      900 // 15 minutes cache
    );
  }

  /**
   * Transform data for storage (add timestamps)
   */
  protected transformForStorage(data: Partial<Deployment>): any {
    const transformed = { ...data };

    if (!transformed.createdAt) {
      transformed.createdAt = new Date();
    }
    transformed.updatedAt = new Date();

    return transformed;
  }

  /**
   * Transform data from storage (convert date strings to Date objects)
   */
  protected transformFromStorage(data: any): Deployment {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }
}