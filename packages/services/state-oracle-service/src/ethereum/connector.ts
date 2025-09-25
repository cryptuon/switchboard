/**
 * EVM Connector for ChainSync State Oracle
 * 
 * Connects to EVM-compatible chains like Ethereum and Polygon
 */

import { JsonRpcProvider, Block, TransactionReceipt } from 'ethers';

interface EVMConfig {
  rpcUrl: string;
  chainId: number;
}

export class EVMConnector {
  private provider: JsonRpcProvider;
  private config: EVMConfig;

  constructor(config: EVMConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Get the current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get a block by its number
   */
  async getBlock(blockNumber: number): Promise<Block | null> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      return block;
    } catch (error) {
      console.error(`Error getting block ${blockNumber}:`, error);
      return null;
    }
  }

  /**
   * Get a block by its hash
   */
  async getBlockByHash(blockHash: string): Promise<Block | null> {
    try {
      const block = await this.provider.getBlock(blockHash, true);
      return block;
    } catch (error) {
      console.error(`Error getting block ${blockHash}:`, error);
      return null;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error(`Error getting transaction receipt ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<bigint> {
    try {
      return await this.provider.getBalance(address);
    } catch (error) {
      console.error(`Error getting balance for ${address}:`, error);
      return 0n;
    }
  }

  /**
   * Get transaction count for an account
   */
  async getTransactionCount(address: string): Promise<number> {
    try {
      return await this.provider.getTransactionCount(address);
    } catch (error) {
      console.error(`Error getting transaction count for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get code at a specific address
   */
  async getCode(address: string): Promise<string> {
    try {
      return await this.provider.getCode(address);
    } catch (error) {
      console.error(`Error getting code for ${address}:`, error);
      return '0x';
    }
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || 0n;
    } catch (error) {
      console.error('Error getting gas price:', error);
      return 0n;
    }
  }

  /**
   * Get fee data
   */
  async getFeeData(): Promise<any> {
    try {
      return await this.provider.getFeeData();
    } catch (error) {
      console.error('Error getting fee data:', error);
      return {
        gasPrice: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error(`Error verifying transaction ${txHash}:`, error);
      return false;
    }
  }

  /**
   * Get the chain ID
   */
  async getChainId(): Promise<bigint> {
    try {
      const network = await this.provider.getNetwork();
      return network.chainId;
    } catch (error) {
      console.error('Error getting chain ID:', error);
      return BigInt(this.config.chainId);
    }
  }

  /**
   * Get the network name
   */
  async getNetworkName(): Promise<string> {
    try {
      const network = await this.provider.getNetwork();
      return network.name;
    } catch (error) {
      console.error('Error getting network name:', error);
      return 'unknown';
    }
  }
}