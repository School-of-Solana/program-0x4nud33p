use anchor_lang::prelude::*;


pub mod error;
pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

declare_id!("7MW29YqzV3MM9mwpjezAR1GWVzgE9pZwHhLW8VFushR6");

#[program]
pub mod escrow_anchor {
    use super::*;

    pub fn make(
        ctx: Context<Make>,
        seed: u64,
        deposit_amount: u64,
        receive_amount: u64,
    ) -> Result<()> {
        ctx.accounts.deposit_into_escrow(deposit_amount)?;
        ctx.accounts.initialize_escrow(seed, receive_amount, &ctx.bumps)
    }

    pub fn refund(ctx:Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.deposit_to_maker()?;
        ctx.accounts.withdraw_to_taker()
    }
}
