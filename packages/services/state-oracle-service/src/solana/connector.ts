/**
 * Solana Connector for ChainSync State Oracle
 * 
 * Connects to Solana blockchain
 */

import { Connection, PublicKey, VersionedTransactionResponse, BlockResponse } from '@solana/web3.js';

interface SolanaConfig {
  rpcUrl: string;
}

interface SolanaBlock {
  slot: number;
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number;
  transactions: any[];
  rewards: any[];
  blockTime: number | null;
}

export class SolanaConnector {
  private connection: Connection;
  private config: SolanaConfig;

  constructor(config: SolanaConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl);
  }

  /**
   * Get the current slot
   */
  async getSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  /**
   * Get a block by its slot
   */
  async getBlock(slot: number): Promise<SolanaBlock | null> {
    try {
      const block = await this.connection.getBlock(slot, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!block) return null;
      
      return {
        slot: block.parentSlot + 1,
        blockhash: block.blockhash,
        previousBlockhash: block.previousBlockhash,
        parentSlot: block.parentSlot,
        transactions: block.transactions || [],
        rewards: block.rewards || [],
        blockTime: block.blockTime || null
      };
    } catch (error) {
      console.error(`Error getting block ${slot}:`, error);
      return null;
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(address: string): Promise<any> {
    try {
      const publicKey = new PublicKey(address);
      return await this.connection.getAccountInfo(publicKey);
    } catch (error) {
      console.error(`Error getting account info for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get transaction
   */
  async getTransaction(signature: string): Promise<VersionedTransactionResponse | null> {
    try {
      return await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
    } catch (error) {
      console.error(`Error getting transaction ${signature}:`, error);
      return null;
    }
  }

  /**
   * Get balance
   */
  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance;
    } catch (error) {
      console.error(`Error getting balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get recent blockhash
   */
  async getRecentBlockhash(): Promise<string> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      return blockhash;
    } catch (error) {
      console.error('Error getting recent blockhash:', error);
      return '';
    }
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(signature);
      return transaction !== null && transaction.meta?.err === null;
    } catch (error) {
      console.error(`Error verifying transaction ${signature}:`, error);
      return false;
    }
  }

  /**
   * Get cluster health
   */
  async getHealth(): Promise<string> {
    try {
      // Solana doesn't have a getHealth method, so we'll check if we can get a slot
      await this.connection.getSlot();
      return 'ok';
    } catch (error) {
      console.error('Error checking cluster health:', error);
      return 'error';
    }
  }

  /**
   * Get epoch info
   */
  async getEpochInfo(): Promise<any> {
    try {
      return await this.connection.getEpochInfo();
    } catch (error) {
      console.error('Error getting epoch info:', error);
      return null;
    }
  }
}