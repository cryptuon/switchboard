/**
 * ChainSync Blockchain Event Repository
 *
 * Repository for managing blockchain events in analytics storage
 */

import { Logger } from '../../logging/logger';
import { MetricsCollector } from '../../metrics/metrics-collector';
import { StorageManager } from '../storage-manager';
import { BaseRepository, RepositoryOptions } from './base-repository';
import { TimeSeriesQuery } from '../interfaces/storage-adapter';

export interface BlockchainEvent {
  id: string;
  deploymentId: string;
  chainId: number;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  eventName: string;
  eventSignature: string;
  eventData: Record<string, any>;
  timestamp: Date;
  contractAddress: string;
  topics: string[];
  rawLog?: any;
}

export class BlockchainEventRepository extends BaseRepository<BlockchainEvent> {
  constructor(
    storageManager: StorageManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    super('blockchain_events', storageManager, logger, metricsCollector);
  }

  /**
   * Insert events in bulk (optimized for high-volume inserts)
   */
  async insertEvents(events: Partial<BlockchainEvent>[], options: RepositoryOptions = {}): Promise<void> {
    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();
        const transformedEvents = events.map(event => this.transformForStorage(event));
        await storage.insert(this.entityName, transformedEvents, { batchSize: 10000 });
      },
      'insertEvents',
      options
    );
  }

  /**
   * Query events by time range
   */
  async findByTimeRange(
    startTime: Date,
    endTime: Date,
    filters: Partial<BlockchainEvent> = {},
    options: RepositoryOptions = {}
  ): Promise<BlockchainEvent[]> {
    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();

        const query: TimeSeriesQuery = {
          timeField: 'timestamp',
          startTime,
          endTime,
          filters
        };

        const results = await storage.queryTimeSeries(this.entityName, query);
        return this.transformListFromStorage(results);
      },
      'findByTimeRange',
      options
    );
  }

  /**
   * Query events by deployment
   */
  async findByDeployment(
    deploymentId: string,
    startTime?: Date,
    endTime?: Date,
    options: RepositoryOptions = {}
  ): Promise<BlockchainEvent[]> {
    const filters: any = { deploymentId };

    if (startTime && endTime) {
      return this.findByTimeRange(startTime, endTime, filters, options);
    }

    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();
        const results = await storage.aggregate(this.entityName, {
          select: ['*'],
          where: filters,
          orderBy: [{ field: 'timestamp', direction: 'DESC' }],
          limit: 10000
        });
        return this.transformListFromStorage(results);
      },
      'findByDeployment',
      options
    );
  }

  /**
   * Get event statistics by time intervals
   */
  async getEventStatsByTime(
    deploymentId: string,
    startTime: Date,
    endTime: Date,
    interval: string = '1h'
  ): Promise<Array<{
    time_bucket: string;
    event_count: number;
    unique_contracts: number;
  }>> {
    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();

        const results = await storage.aggregateByTime(this.entityName, {
          timeField: 'timestamp',
          interval,
          metrics: [
            { field: '*', function: 'count' },
            { field: 'contractAddress', function: 'count' }
          ],
          startTime,
          endTime,
          filters: { deploymentId }
        });

        return results.map((row: any) => ({
          time_bucket: row.time_bucket,
          event_count: row.count || 0,
          unique_contracts: row.contractAddress_count || 0
        }));
      },
      'getEventStatsByTime'
    );
  }

  /**
   * Get top events by frequency
   */
  async getTopEventsByFrequency(
    deploymentId: string,
    startTime: Date,
    endTime: Date,
    limit: number = 10
  ): Promise<Array<{
    eventName: string;
    count: number;
    contractAddress: string;
  }>> {
    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();

        const results = await storage.aggregate(this.entityName, {
          select: [
            'eventName',
            'contractAddress',
            'COUNT(*) as count'
          ],
          where: {
            deploymentId,
            'timestamp >=': startTime,
            'timestamp <=': endTime
          },
          groupBy: ['eventName', 'contractAddress'],
          orderBy: [{ field: 'count', direction: 'DESC' }],
          limit
        });

        return results;
      },
      'getTopEventsByFrequency'
    );
  }

  /**
   * Get events by block range
   */
  async findByBlockRange(
    chainId: number,
    startBlock: number,
    endBlock: number,
    options: RepositoryOptions = {}
  ): Promise<BlockchainEvent[]> {
    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();

        const results = await storage.aggregate(this.entityName, {
          select: ['*'],
          where: {
            chainId,
            'blockNumber >=': startBlock,
            'blockNumber <=': endBlock
          },
          orderBy: [
            { field: 'blockNumber', direction: 'ASC' },
            { field: 'logIndex', direction: 'ASC' }
          ]
        });

        return this.transformListFromStorage(results);
      },
      'findByBlockRange',
      options
    );
  }

  /**
   * Get latest processed block for a chain
   */
  async getLatestProcessedBlock(chainId: number): Promise<number> {
    const cacheKey = this.buildCacheKey('getLatestProcessedBlock', { chainId });

    return this.findWithCache(
      cacheKey,
      async () => {
        const storage = this.getTimeSeriesStorage();

        const results = await storage.aggregate(this.entityName, {
          select: ['MAX(blockNumber) as maxBlock'],
          where: { chainId }
        });

        return results[0]?.maxBlock || 0;
      },
      30 // 30 seconds cache
    );
  }

  /**
   * Delete old events (data retention)
   */
  async deleteOldEvents(olderThan: Date): Promise<{ deletedCount: number }> {
    return this.executeOperation(
      async () => {
        const storage = this.getTimeSeriesStorage();

        // For time-series databases, this might be implemented as partition dropping
        // For now, we'll use a simple delete operation
        await storage.aggregate(this.entityName, {
          select: ['DELETE'],
          where: {
            'timestamp <': olderThan
          }
        });

        // Return estimated count (exact count might be expensive)
        return { deletedCount: 0 };
      },
      'deleteOldEvents'
    );
  }

  /**
   * Transform data for storage
   */
  protected transformForStorage(data: Partial<BlockchainEvent>): any {
    const transformed = { ...data };

    // Ensure timestamp is a proper Date object
    if (transformed.timestamp) {
      transformed.timestamp = new Date(transformed.timestamp);
    }

    // Convert eventData to JSON string for storage if needed
    if (transformed.eventData && typeof transformed.eventData === 'object') {
      transformed.eventDataJson = JSON.stringify(transformed.eventData);
    }

    return transformed;
  }

  /**
   * Transform data from storage
   */
  protected transformFromStorage(data: any): BlockchainEvent {
    const transformed = { ...data };

    // Convert timestamp back to Date object
    if (transformed.timestamp) {
      transformed.timestamp = new Date(transformed.timestamp);
    }

    // Parse eventData JSON if needed
    if (transformed.eventDataJson && typeof transformed.eventDataJson === 'string') {
      try {
        transformed.eventData = JSON.parse(transformed.eventDataJson);
        delete transformed.eventDataJson;
      } catch (error) {
        // If parsing fails, keep original data
      }
    }

    return transformed;
  }
}