/**
 * Bitcoin Connector for ChainSync State Oracle
 * 
 * Connects to Bitcoin blockchain
 */

import axios from 'axios';

interface BitcoinConfig {
  rpcUrl: string;
  username?: string;
  password?: string;
}

interface BitcoinBlock {
  hash: string;
  height: number;
  time: number;
  tx: any[];
  previousblockhash: string;
  merkleroot: string;
  bits: string;
  nonce: number;
  size: number;
  weight: number;
  version: number;
}

export class BitcoinConnector {
  private config: BitcoinConfig;
  private axiosInstance: any;

  constructor(config: BitcoinConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.rpcUrl,
      auth: config.username && config.password ? {
        username: config.username,
        password: config.password
      } : undefined
    });
  }

  /**
   * Get the current block height
   */
  async getBlockHeight(): Promise<number> {
    try {
      const response = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getblockcount'
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error getting block height:', error);
      return 0;
    }
  }

  /**
   * Get a block by its height
   */
  async getBlock(height: number): Promise<BitcoinBlock | null> {
    try {
      // First get the block hash at this height
      const hashResponse = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getblockhash',
        params: [height]
      });
      
      const blockHash = hashResponse.data.result;
      
      // Then get the block details
      const blockResponse = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 2,
        method: 'getblock',
        params: [blockHash, 2] // Verbosity level 2 includes transaction details
      });
      
      return blockResponse.data.result;
    } catch (error) {
      console.error(`Error getting block ${height}:`, error);
      return null;
    }
  }

  /**
   * Get a block by its hash
   */
  async getBlockByHash(hash: string): Promise<BitcoinBlock | null> {
    try {
      const response = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getblock',
        params: [hash, 2] // Verbosity level 2 includes transaction details
      });
      
      return response.data.result;
    } catch (error) {
      console.error(`Error getting block ${hash}:`, error);
      return null;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txid: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getrawtransaction',
        params: [txid, true] // True means return decoded transaction
      });
      
      return response.data.result;
    } catch (error) {
      console.error(`Error getting transaction ${txid}:`, error);
      return null;
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(txid: string): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(txid);
      return transaction !== null;
    } catch (error) {
      console.error(`Error verifying transaction ${txid}:`, error);
      return false;
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getnetworkinfo'
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  }

  /**
   * Get blockchain info
   */
  async getBlockchainInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getblockchaininfo'
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error getting blockchain info:', error);
      return null;
    }
  }

  /**
   * Get mempool info
   */
  async getMempoolInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getmempoolinfo'
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error getting mempool info:', error);
      return null;
    }
  }
}