use anchor_lang::prelude::*;

declare_id!("32vyJ45ERLUVDzPwaCVWxBfjFx8gBBRz46GxUgm8uXGy");

#[program]
pub mod test_simple {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Simple test program initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}