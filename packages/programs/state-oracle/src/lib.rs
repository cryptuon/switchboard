use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("F9PpEEnEt7nnNzDom1wK2GtLk2A94ffvMuqbcxXkfwtn");

mod fee_calculator;
use fee_calculator::{FeeStructure, Treasury};

// Constants for streaming optimization
const MAX_CHAIN_STATES: usize = 100; // Support up to 100 chains
const COORDINATION_TARGET_MS: u64 = 400; // Sub-400ms target
const MAX_EVENTS_PER_BATCH: usize = 50;

#[program]
pub mod state_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("State Oracle program initialized");
        Ok(())
    }

    pub fn verify_state(ctx: Context<VerifyState>, chain_data: ChainStateData, chain_id: u32) -> Result<()> {
        let start_time = Clock::get()?.unix_timestamp;
        msg!("Real-time verifying state for chain: {}", chain_data.chain_id);

        let state_account = &mut ctx.accounts.state_account;

        // Enhanced validation for streaming
        require!(chain_data.block_number > 0, StateOracleError::InvalidBlockNumber);
        require!(!chain_data.block_hash.is_empty(), StateOracleError::InvalidBlockHash);
        require!(chain_data.timestamp > 0, StateOracleError::InvalidTimestamp);
        require!(chain_data.transactions.len() <= MAX_EVENTS_PER_BATCH, StateOracleError::TooManyTransactions);

        // Optimized verification hash using Solana's hash function
        let verification_data = [
            &chain_data.chain_id.to_le_bytes(),
            &chain_data.block_number.to_le_bytes(),
            &chain_data.timestamp.to_le_bytes(),
            &chain_data.block_hash,
        ].concat();
        let verification_hash = hash(&verification_data).to_bytes();

        // Store the verified state with optimization flags
        state_account.chain_id = chain_data.chain_id;
        state_account.block_number = chain_data.block_number;
        state_account.block_hash = chain_data.block_hash.clone();
        state_account.timestamp = chain_data.timestamp;
        state_account.verification_hash = verification_hash;
        state_account.last_updated = Clock::get()?.unix_timestamp;
        state_account.transaction_count = chain_data.transactions.len() as u32;
        state_account.is_streaming = true;

        // Calculate processing latency
        let processing_time = Clock::get()?.unix_timestamp - start_time;

        // Emit real-time verification event with performance metrics
        emit!(StateVerified {
            chain_id: chain_data.chain_id,
            block_number: chain_data.block_number,
            verification_hash: verification_hash,
            timestamp: chain_data.timestamp,
            transaction_count: chain_data.transactions.len() as u32,
            processing_time_ms: (processing_time * 1000) as u64,
            is_realtime: processing_time < (COORDINATION_TARGET_MS as i64 / 1000),
        });

        // Emit individual transaction events for real-time tracking
        for (i, tx) in chain_data.transactions.iter().enumerate() {
            emit!(TransactionProcessed {
                chain_id: chain_data.chain_id,
                block_number: chain_data.block_number,
                tx_index: i as u32,
                tx_hash: tx.tx_hash.clone(),
                status: tx.status,
                gas_used: tx.gas_used,
            });
        }

        msg!("State verified for chain {} at block {} in {}ms (target: {}ms)",
            chain_data.chain_id,
            chain_data.block_number,
            processing_time * 1000,
            COORDINATION_TARGET_MS
        );
        Ok(())
    }

    /// Immediate state coordination for streaming oracle (optimized for sub-400ms)
    pub fn coordinate_immediate_state(ctx: Context<CoordinateImmediate>, chain_data: ChainStateData) -> Result<()> {
        let start_time = Clock::get()?.unix_timestamp;
        msg!("Immediate coordination for chain {}", chain_data.chain_id);

        let state_account = &mut ctx.accounts.state_account;

        // Fast-path validation (minimal checks for speed)
        require!(chain_data.block_number > state_account.block_number, StateOracleError::StaleBlockNumber);

        // Update state immediately
        state_account.chain_id = chain_data.chain_id;
        state_account.block_number = chain_data.block_number;
        state_account.timestamp = chain_data.timestamp;
        state_account.last_updated = Clock::get()?.unix_timestamp;
        state_account.is_streaming = true;

        let processing_time = Clock::get()?.unix_timestamp - start_time;

        // Emit immediate coordination event
        emit!(ImmediateCoordination {
            chain_id: chain_data.chain_id,
            block_number: chain_data.block_number,
            processing_time_ms: (processing_time * 1000) as u64,
            coordination_timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Immediate coordination completed in {}ms", processing_time * 1000);
        Ok(())
    }

    /// Batch coordination for multiple chains (streaming optimization)
    pub fn coordinate_batch_states(ctx: Context<CoordinateBatch>, batch_data: Vec<ChainStateData>) -> Result<()> {
        let start_time = Clock::get()?.unix_timestamp;
        require!(batch_data.len() <= MAX_EVENTS_PER_BATCH, StateOracleError::BatchTooLarge);

        msg!("Batch coordinating {} chains", batch_data.len());

        let batch_account = &mut ctx.accounts.batch_account;
        batch_account.batch_id = Clock::get()?.unix_timestamp as u64;
        batch_account.chain_count = batch_data.len() as u32;
        batch_account.start_time = start_time;

        // Process each chain in the batch
        for (i, chain_data) in batch_data.iter().enumerate() {
            if i < MAX_CHAIN_STATES {
                batch_account.chain_ids[i] = chain_data.chain_id;
                batch_account.block_numbers[i] = chain_data.block_number;
            }
        }

        let processing_time = Clock::get()?.unix_timestamp - start_time;
        batch_account.processing_time_ms = (processing_time * 1000) as u64;

        // Emit batch coordination event
        emit!(BatchCoordination {
            batch_id: batch_account.batch_id,
            chain_count: batch_data.len() as u32,
            processing_time_ms: (processing_time * 1000) as u64,
            target_met: processing_time < (COORDINATION_TARGET_MS as i64 / 1000),
        });

        Ok(())
    }

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.total_fees = 0;
        treasury.transaction_count = 0;
        treasury.owner = ctx.accounts.owner.key();
        Ok(())
    }

    pub fn collect_fee(ctx: Context<CollectFee>, amount: u64) -> Result<()> {
        let fee_structure = FeeStructure::default();
        let fee = fee_structure.calculate_fee(amount);
        
        // Transfer fee from user to treasury
        // Note: In a real implementation, this would use Solana's transfer instruction
        // and proper account validation
        
        let treasury = &mut ctx.accounts.treasury;
        treasury.add_fees(fee);
        
        msg!("Collected fee: {}", fee);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(chain_data: ChainStateData, chain_id: u32)]
pub struct VerifyState<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + ChainState::INIT_SPACE,
        seeds = [b"state", &chain_id.to_le_bytes()],
        bump
    )]
    pub state_account: Account<'info, ChainState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(chain_data: ChainStateData)]
pub struct CoordinateImmediate<'info> {
    #[account(
        mut,
        seeds = [b"state", &chain_data.chain_id.to_le_bytes()],
        bump
    )]
    pub state_account: Account<'info, ChainState>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(batch_data: Vec<ChainStateData>)]
pub struct CoordinateBatch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + BatchCoordinationState::INIT_SPACE
    )]
    pub batch_account: Account<'info, BatchCoordinationState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 8 + 8 + 32
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CollectFee<'info> {
    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
}

// Data structures for cross-chain state
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChainStateData {
    pub chain_id: u32,
    pub block_number: u64,
    pub block_hash: Vec<u8>,
    pub timestamp: i64,
    pub transactions: Vec<TransactionData>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TransactionData {
    pub tx_hash: Vec<u8>,
    pub from_address: Vec<u8>,
    pub to_address: Vec<u8>,
    pub value: u64,
    pub gas_used: u64,
    pub status: u8, // 0 = failed, 1 = success
}

// Account to store verified chain state (optimized for streaming)
#[account]
pub struct ChainState {
    pub chain_id: u32,
    pub block_number: u64,
    pub block_hash: Vec<u8>,
    pub timestamp: i64,
    pub verification_hash: [u8; 32],
    pub last_updated: i64,
    pub transaction_count: u32,
    pub is_streaming: bool,
    pub coordination_latency_ms: u64,
}

impl ChainState {
    pub const INIT_SPACE: usize = 4 + 8 + (4 + 64) + 8 + 32 + 8 + 4 + 1 + 8; // ~140 bytes
}

// Account for batch coordination state
#[account]
pub struct BatchCoordinationState {
    pub batch_id: u64,
    pub chain_count: u32,
    pub start_time: i64,
    pub processing_time_ms: u64,
    pub chain_ids: [u32; MAX_CHAIN_STATES],
    pub block_numbers: [u64; MAX_CHAIN_STATES],
}

impl BatchCoordinationState {
    pub const INIT_SPACE: usize = 8 + 4 + 8 + 8 + (4 * MAX_CHAIN_STATES) + (8 * MAX_CHAIN_STATES); // ~2KB
}

// Enhanced events for real-time streaming
#[event]
pub struct StateVerified {
    pub chain_id: u32,
    pub block_number: u64,
    pub verification_hash: [u8; 32],
    pub timestamp: i64,
    pub transaction_count: u32,
    pub processing_time_ms: u64,
    pub is_realtime: bool,
}

#[event]
pub struct TransactionProcessed {
    pub chain_id: u32,
    pub block_number: u64,
    pub tx_index: u32,
    pub tx_hash: Vec<u8>,
    pub status: u8,
    pub gas_used: u64,
}

#[event]
pub struct ImmediateCoordination {
    pub chain_id: u32,
    pub block_number: u64,
    pub processing_time_ms: u64,
    pub coordination_timestamp: i64,
}

#[event]
pub struct BatchCoordination {
    pub batch_id: u64,
    pub chain_count: u32,
    pub processing_time_ms: u64,
    pub target_met: bool,
}

#[event]
pub struct PerformanceMetric {
    pub metric_type: String,
    pub value: u64,
    pub timestamp: i64,
    pub chain_id: u32,
}

// Enhanced custom errors for streaming
#[error_code]
pub enum StateOracleError {
    #[msg("Invalid block number")]
    InvalidBlockNumber,
    #[msg("Invalid block hash")]
    InvalidBlockHash,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Verification failed")]
    VerificationFailed,
    #[msg("Too many transactions in batch")]
    TooManyTransactions,
    #[msg("Stale block number")]
    StaleBlockNumber,
    #[msg("Batch too large")]
    BatchTooLarge,
    #[msg("Coordination timeout")]
    CoordinationTimeout,
    #[msg("Invalid chain configuration")]
    InvalidChainConfig,
}