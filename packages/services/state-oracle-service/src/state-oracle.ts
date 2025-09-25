/**
 * Unified State Oracle for ChainSync
 * 
 * Orchestrates data collection from multiple blockchain networks
 */

import { EventEmitter } from 'events';
import { EVMConnector } from './ethereum/connector';
import { SolanaConnector } from './solana/connector';
import { BitcoinConnector } from './bitcoin/connector';

interface ChainConfig {
  name: string;
  type: 'evm' | 'solana' | 'bitcoin';
  rpcUrl: string;
  chainId?: number;
  username?: string;
  password?: string;
}

interface UnifiedStateData {
  chain: string;
  blockNumber: number;
  timestamp: number;
  transactions: number;
  hash: string;
  metadata: any;
}

export class UnifiedStateOracle extends EventEmitter {
  private chains: Map<string, ChainConfig> = new Map();
  private connectors: Map<string, any> = new Map();
  private isRunning: boolean = false;
  private pollingInterval: number = 5000; // 5 seconds default

  constructor() {
    super();
  }

  /**
   * Add a blockchain network to monitor
   */
  addChain(config: ChainConfig): void {
    this.chains.set(config.name, config);
    console.log(`Added chain ${config.name} to monitoring`);
  }

  /**
   * Remove a blockchain network from monitoring
   */
  removeChain(chainName: string): void {
    this.chains.delete(chainName);
    this.connectors.delete(chainName);
    console.log(`Removed chain ${chainName} from monitoring`);
  }

  /**
   * Initialize all connectors
   */
  private initializeConnectors(): void {
    console.log('Initializing connectors for all chains...');
    
    for (const [chainName, config] of this.chains.entries()) {
      try {
        switch (config.type) {
          case 'evm':
            this.connectors.set(chainName, new EVMConnector({
              rpcUrl: config.rpcUrl,
              chainId: config.chainId || 0
            }));
            break;
          case 'solana':
            this.connectors.set(chainName, new SolanaConnector({
              rpcUrl: config.rpcUrl
            }));
            break;
          case 'bitcoin':
            this.connectors.set(chainName, new BitcoinConnector({
              rpcUrl: config.rpcUrl,
              username: config.username,
              password: config.password
            }));
            break;
          default:
            console.error(`Unsupported chain type: ${config.type}`);
        }
      } catch (error) {
        console.error(`Error initializing connector for ${chainName}:`, error);
      }
    }
  }

  /**
   * Start the unified state oracle
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Unified state oracle is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting ChainSync Unified State Oracle...');
    
    // Initialize all connectors
    this.initializeConnectors();
    
    // Start monitoring all chains
    for (const [chainName, config] of this.chains.entries()) {
      this.monitorChain(chainName, config);
    }
  }

  /**
   * Stop the unified state oracle
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Unified state oracle is not running');
      return;
    }

    this.isRunning = false;
    console.log('Stopping ChainSync Unified State Oracle...');
  }

  /**
   * Monitor a specific chain for state changes
   */
  private async monitorChain(chainName: string, config: ChainConfig): Promise<void> {
    console.log(`Starting monitoring for chain ${chainName}`);
    
    const connector = this.connectors.get(chainName);
    if (!connector) {
      console.error(`No connector found for chain ${chainName}`);
      return;
    }

    // Poll for new blocks
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        let stateData: UnifiedStateData | null = null;
        
        switch (config.type) {
          case 'evm':
            const evmBlockNumber = await connector.getBlockNumber();
            const evmBlock = await connector.getBlock(evmBlockNumber);
            
            if (evmBlock) {
              stateData = {
                chain: chainName,
                blockNumber: evmBlock.number,
                timestamp: evmBlock.timestamp,
                transactions: evmBlock.transactions?.length || 0,
                hash: evmBlock.hash,
                metadata: {
                  gasUsed: evmBlock.gasUsed?.toString() || '0',
                  gasLimit: evmBlock.gasLimit?.toString() || '0',
                  miner: evmBlock.miner || '',
                  difficulty: evmBlock.difficulty?.toString() || '0'
                }
              };
            }
            break;
            
          case 'solana':
            const solanaSlot = await connector.getSlot();
            const solanaBlock = await connector.getBlock(solanaSlot);
            
            if (solanaBlock) {
              stateData = {
                chain: chainName,
                blockNumber: solanaSlot,
                timestamp: solanaBlock.blockTime || Math.floor(Date.now() / 1000),
                transactions: solanaBlock.transactions?.length || 0,
                hash: solanaBlock.blockhash,
                metadata: {
                  parentSlot: solanaBlock.parentSlot,
                  rewards: solanaBlock.rewards?.length || 0
                }
              };
            }
            break;
            
          case 'bitcoin':
            const bitcoinBlockHeight = await connector.getBlockHeight();
            const bitcoinBlock = await connector.getBlock(bitcoinBlockHeight);
            
            if (bitcoinBlock) {
              stateData = {
                chain: chainName,
                blockNumber: bitcoinBlockHeight,
                timestamp: bitcoinBlock.time,
                transactions: bitcoinBlock.tx?.length || 0,
                hash: bitcoinBlock.hash,
                metadata: {
                  merkleroot: bitcoinBlock.merkleroot,
                  bits: bitcoinBlock.bits,
                  nonce: bitcoinBlock.nonce,
                  size: bitcoinBlock.size,
                  weight: bitcoinBlock.weight
                }
              };
            }
            break;
        }
        
        if (stateData) {
          // Emit state data for processing
          this.emit('stateData', stateData);
          
          // Also emit for specific chain
          this.emit(`stateData:${chainName}`, stateData);
        }
      } catch (error) {
        console.error(`Error monitoring ${chainName}:`, error);
      }

      // Schedule next poll
      if (this.isRunning) {
        setTimeout(poll, this.pollingInterval);
      }
    };

    // Start polling
    poll();
  }

  /**
   * Get current configuration
   */
  getConfig(): { chains: ChainConfig[]; isRunning: boolean; pollingInterval: number } {
    return {
      chains: Array.from(this.chains.values()),
      isRunning: this.isRunning,
      pollingInterval: this.pollingInterval
    };
  }

  /**
   * Set polling interval
   */
  setPollingInterval(interval: number): void {
    this.pollingInterval = interval;
    console.log(`Set polling interval to ${interval}ms`);
  }

  /**
   * Get connector for a specific chain
   */
  getConnector(chainName: string): any {
    return this.connectors.get(chainName);
  }
}