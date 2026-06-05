/**
 * Solana Program Integration
 *
 * Handles real integration with Switchboard Solana programs
 */

import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { ChainStateData, BlockData } from './connectors/base-connector';

// Program IDs (these would be the actual deployed program IDs)
const STATE_ORACLE_PROGRAM_ID = new PublicKey('F9PpEEnEt7nnNzDom1wK2GtLk2A94ffvMuqbcxXkfwtn');
const COORDINATOR_PROGRAM_ID = new PublicKey('CZP1U8GuiYYW8P3FRTb23nkFBKiKHcwX64oxxMp9QYtP');

export interface SolanaIntegrationConfig {
  connection: Connection;
  payerKeypair: Keypair;
  stateOracleProgramId?: PublicKey;
  coordinatorProgramId?: PublicKey;
}

export class SolanaIntegration {
  private connection: Connection;
  private payerKeypair: Keypair;
  private stateOracleProgramId: PublicKey;
  private coordinatorProgramId: PublicKey;
  private coordinationMetrics: {
    totalCoordinations: number;
    averageLatency: number;
    successRate: number;
    lastCoordinationTime: number;
  };

  constructor(config: SolanaIntegrationConfig) {
    this.connection = config.connection;
    this.payerKeypair = config.payerKeypair;
    this.stateOracleProgramId = config.stateOracleProgramId || STATE_ORACLE_PROGRAM_ID;
    this.coordinatorProgramId = config.coordinatorProgramId || COORDINATOR_PROGRAM_ID;
    this.coordinationMetrics = {
      totalCoordinations: 0,
      averageLatency: 0,
      successRate: 100,
      lastCoordinationTime: Date.now()
    };
  }

  /**
   * Store verified state data in Solana State Oracle Program
   */
  async storeVerifiedStates(stateData: ChainStateData[]): Promise<string[]> {
    console.log(`📝 Storing ${stateData.length} verified states in Solana...`);

    const signatures: string[] = [];

    for (const chainState of stateData) {
      try {
        const signature = await this.storeChainState(chainState);
        signatures.push(signature);
        console.log(`✅ Stored state for ${chainState.chainName}: ${signature}`);
      } catch (error) {
        console.error(`❌ Failed to store state for ${chainState.chainName}:`, error);
        throw error;
      }
    }

    console.log(`✅ Successfully stored ${signatures.length} chain states in Solana`);
    return signatures;
  }

  /**
   * Store individual chain state in State Oracle Program
   */
  private async storeChainState(chainState: ChainStateData): Promise<string> {
    // Generate state account PDA
    const [stateAccount, stateAccountBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('state'),
        new BN(chainState.chainId).toArrayLike(Buffer, 'le', 4)
      ],
      this.stateOracleProgramId
    );

    // Convert chain state data to program format
    const chainStateData = {
      chainId: chainState.chainId,
      blockNumber: new BN(chainState.blockData.blockNumber),
      blockHash: this.stringToBytes32(chainState.blockData.blockHash),
      timestamp: new BN(chainState.blockData.timestamp),
    };

    // Create instruction data
    const instructionData = Buffer.concat([
      Buffer.from([0]), // verify_state instruction discriminator
      this.serializeChainStateData(chainStateData),
      new BN(chainState.chainId).toArrayLike(Buffer, 'le', 4)
    ]);

    // Create instruction
    const instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: stateAccount,
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: this.payerKeypair.publicKey,
          isSigner: true,
          isWritable: true
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false
        }
      ],
      programId: this.stateOracleProgramId,
      data: instructionData
    });

    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await this.connection.sendTransaction(
      transaction,
      [this.payerKeypair],
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  /**
   * Coordinate state synchronization across multiple chains
   */
  async coordinateStateSynchronization(stateData: ChainStateData[]): Promise<string> {
    console.log(`🔄 Coordinating state synchronization for ${stateData.length} chains...`);

    // Generate sync account PDA
    const syncId = Date.now(); // Use timestamp as sync ID
    const [syncAccount, syncAccountBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('sync'),
        new BN(syncId).toArrayLike(Buffer, 'le', 8)
      ],
      this.coordinatorProgramId
    );

    // Prepare chain states for coordinator
    const chainStates = stateData.map(state => ({
      chainId: state.chainId,
      blockNumber: new BN(state.blockData.blockNumber),
      blockHash: this.stringToBytes32(state.blockData.blockHash),
      timestamp: new BN(state.blockData.timestamp)
    }));

    // Create sync data
    const syncData = {
      syncId: new BN(syncId),
      chainStates: chainStates.slice(0, 10) // Limit to 10 chains as per program constraint
    };

    // Create instruction data
    const instructionData = Buffer.concat([
      Buffer.from([1]), // sync_state instruction discriminator
      this.serializeSyncData(syncData)
    ]);

    // Create instruction
    const instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: syncAccount,
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: this.payerKeypair.publicKey,
          isSigner: true,
          isWritable: true
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false
        }
      ],
      programId: this.coordinatorProgramId,
      data: instructionData
    });

    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await this.connection.sendTransaction(
      transaction,
      [this.payerKeypair],
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ State synchronization coordinated: ${signature}`);
    return signature;
  }

  /**
   * Get stored state data for a specific chain
   */
  async getStoredChainState(chainId: number): Promise<any | null> {
    try {
      const [stateAccount] = await PublicKey.findProgramAddress(
        [
          Buffer.from('state'),
          new BN(chainId).toArrayLike(Buffer, 'le', 4)
        ],
        this.stateOracleProgramId
      );

      const accountInfo = await this.connection.getAccountInfo(stateAccount);

      if (!accountInfo) {
        console.log(`No stored state found for chain ${chainId}`);
        return null;
      }

      // Parse account data (simplified - would need proper deserialization)
      const data = accountInfo.data;
      console.log(`Retrieved stored state for chain ${chainId}: ${data.length} bytes`);

      return {
        chainId,
        dataLength: data.length,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Failed to get stored state for chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get system status from Solana programs
   */
  async getSystemStatus(): Promise<{
    stateOracleStatus: boolean;
    coordinatorStatus: boolean;
    lastBlockHash: string;
  }> {
    try {
      // Check if programs exist and are operational
      const stateOracleAccount = await this.connection.getAccountInfo(this.stateOracleProgramId);
      const coordinatorAccount = await this.connection.getAccountInfo(this.coordinatorProgramId);

      const latestBlockhash = await this.connection.getLatestBlockhash();

      return {
        stateOracleStatus: stateOracleAccount !== null,
        coordinatorStatus: coordinatorAccount !== null,
        lastBlockHash: latestBlockhash.blockhash
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        stateOracleStatus: false,
        coordinatorStatus: false,
        lastBlockHash: ''
      };
    }
  }

  // Helper methods for data serialization

  private stringToBytes32(str: string): number[] {
    // Convert hex string to bytes32
    const hex = str.startsWith('0x') ? str.slice(2) : str;
    const bytes = [];

    for (let i = 0; i < 64; i += 2) {
      if (i < hex.length) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      } else {
        bytes.push(0);
      }
    }

    return bytes.slice(0, 32); // Ensure exactly 32 bytes
  }

  private serializeChainStateData(chainStateData: any): Buffer {
    // Simplified serialization - in production would use proper Borsh serialization
    const buffers = [
      new BN(chainStateData.chainId).toArrayLike(Buffer, 'le', 4),
      chainStateData.blockNumber.toArrayLike(Buffer, 'le', 8),
      Buffer.from(chainStateData.blockHash),
      chainStateData.timestamp.toArrayLike(Buffer, 'le', 8)
    ];

    return Buffer.concat(buffers);
  }

  private serializeSyncData(syncData: any): Buffer {
    // Simplified serialization for sync data
    const buffers = [
      syncData.syncId.toArrayLike(Buffer, 'le', 8),
      Buffer.from([syncData.chainStates.length]) // Number of chain states
    ];

    // Add each chain state
    for (const chainState of syncData.chainStates) {
      buffers.push(
        new BN(chainState.chainId).toArrayLike(Buffer, 'le', 4),
        chainState.blockNumber.toArrayLike(Buffer, 'le', 8),
        Buffer.from(chainState.blockHash),
        chainState.timestamp.toArrayLike(Buffer, 'le', 8)
      );
    }

    return Buffer.concat(buffers);
  }

  /**
   * Real-time coordination methods for streaming oracle
   */

  /**
   * Immediate state coordination optimized for sub-400ms latency
   */
  async coordinateImmediateState(stateChange: ChainStateData): Promise<string> {
    const startTime = Date.now();

    try {
      // Fast-track single state coordination
      const [stateAccount] = await PublicKey.findProgramAddress(
        [
          Buffer.from('state'),
          new BN(stateChange.chainId).toArrayLike(Buffer, 'le', 4)
        ],
        this.stateOracleProgramId
      );

      // Optimized instruction for real-time processing
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: stateAccount, isSigner: false, isWritable: true },
          { pubkey: this.payerKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: this.stateOracleProgramId,
        data: this.serializeChainStateData({
          chainId: stateChange.chainId,
          blockNumber: new BN(stateChange.blockData.blockNumber),
          blockHash: this.stringToBytes32(stateChange.blockData.blockHash),
          timestamp: new BN(stateChange.blockData.timestamp)
        })
      });

      // Send with optimized commitment level for speed
      const transaction = new Transaction().add(instruction);
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.payerKeypair],
        {
          skipPreflight: true, // Skip for speed
          preflightCommitment: 'processed', // Fastest commitment
          maxRetries: 3
        }
      );

      const latency = Date.now() - startTime;
      this.updateCoordinationMetrics(latency, true);

      console.log(`⚡ Immediate coordination completed in ${latency}ms: ${signature.slice(0, 8)}...`);
      return signature;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateCoordinationMetrics(latency, false);

      console.error(`❌ Immediate coordination failed in ${latency}ms:`, error);
      throw error;
    }
  }

  /**
   * Update coordination performance metrics
   */
  private updateCoordinationMetrics(latency: number, success: boolean): void {
    this.coordinationMetrics.totalCoordinations++;
    this.coordinationMetrics.lastCoordinationTime = Date.now();

    // Moving average for latency
    this.coordinationMetrics.averageLatency =
      (this.coordinationMetrics.averageLatency * 0.9) + (latency * 0.1);

    // Moving average for success rate
    const successValue = success ? 100 : 0;
    this.coordinationMetrics.successRate =
      (this.coordinationMetrics.successRate * 0.95) + (successValue * 0.05);
  }

  /**
   * Get real-time coordination metrics
   */
  getCoordinationMetrics(): {
    totalCoordinations: number;
    averageLatency: number;
    successRate: number;
    lastCoordinationTime: number;
    performanceStatus: 'optimal' | 'acceptable' | 'degraded';
  } {
    const performanceStatus =
      this.coordinationMetrics.averageLatency <= 200 ? 'optimal' :
      this.coordinationMetrics.averageLatency <= 400 ? 'acceptable' : 'degraded';

    return {
      ...this.coordinationMetrics,
      performanceStatus
    };
  }

  /**
   * Initialize a connection with automatic keypair generation for testing
   */
  static async createTestConnection(rpcUrl: string): Promise<SolanaIntegration> {
    const connection = new Connection(rpcUrl, 'confirmed');

    // Generate a test keypair (in production, load from secure storage)
    const payerKeypair = Keypair.generate();

    // For testnet, request airdrop
    if (rpcUrl.includes('devnet') || rpcUrl.includes('testnet')) {
      try {
        const airdropSignature = await connection.requestAirdrop(
          payerKeypair.publicKey,
          web3.LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);
        console.log(`✅ Airdropped 1 SOL to test account: ${payerKeypair.publicKey.toString()}`);
      } catch (error) {
        console.warn('Failed to airdrop SOL:', error);
      }
    }

    return new SolanaIntegration({
      connection,
      payerKeypair
    });
  }
}