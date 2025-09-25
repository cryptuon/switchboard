/**
 * Ethereum connector for ChainSync Oracle Service
 */

import { JsonRpcProvider, Block, TransactionReceipt, BigNumberish } from 'ethers';

interface EthereumConfig {
  rpcUrl: string;
  chainId: number;
}

export class EthereumConnector {
  private provider: JsonRpcProvider;
  private config: EthereumConfig;

  constructor(config: EthereumConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Get the configuration
   */
  getConfig(): EthereumConfig {
    return this.config;
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
    return await this.provider.getBlock(blockNumber);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<BigNumberish> {
    return await this.provider.getBalance(address);
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }
}