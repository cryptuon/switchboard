//! Fee calculation logic for Switchboard programs

use anchor_lang::prelude::*;

/// Fee structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FeeStructure {
    /// Base fee in basis points (100 = 1%)
    pub base_rate: u64,
    /// Discount for high volume users (in basis points)
    pub volume_discount: u64,
}

impl FeeStructure {
    /// Calculate fee for a transaction amount
    pub fn calculate_fee(&self, amount: u64) -> u64 {
        let base_fee = (amount * self.base_rate) / 10000;
        
        // Apply volume discount if applicable
        if self.volume_discount > 0 {
            (base_fee * (10000 - self.volume_discount)) / 10000
        } else {
            base_fee
        }
    }
}

/// Default fee structure (0.04%)
impl Default for FeeStructure {
    fn default() -> Self {
        FeeStructure {
            base_rate: 4, // 0.04%
            volume_discount: 0,
        }
    }
}