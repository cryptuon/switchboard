pub mod lib;

pub use lib::*;

use anchor_lang::prelude::*;

/// Treasury account to store collected fees
#[account]
pub struct Treasury {
    pub total_fees: u64,
    pub transaction_count: u64,
    pub owner: Pubkey,
}

impl Treasury {
    pub fn add_fees(&mut self, amount: u64) {
        self.total_fees += amount;
        self.transaction_count += 1;
    }
}