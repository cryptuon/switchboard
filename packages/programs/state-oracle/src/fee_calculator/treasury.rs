//! Treasury account management for ChainSync programs

use anchor_lang::prelude::*;

/// Treasury account for collecting fees
#[account]
#[derive(Default)]
pub struct Treasury {
    /// Total fees collected
    pub total_fees: u64,
    /// Number of transactions processed
    pub transaction_count: u64,
    /// Owner of the treasury (multisig wallet)
    pub owner: Pubkey,
}

impl Treasury {
    /// Add fees to the treasury
    pub fn add_fees(&mut self, amount: u64) {
        self.total_fees += amount;
        self.transaction_count += 1;
    }
}