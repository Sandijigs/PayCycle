#![no_std]

mod types;
mod errors;
mod events;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};
use types::*;
use errors::PayCycleError;

#[contract]
pub struct SubscriptionContract;

/// Storage keys
const ADMIN: &str = "admin";
const FEE_BPS: &str = "fee_bps";
const FEE_COLLECTOR: &str = "fee_col";
const PLAN_COUNT: &str = "plan_cnt";
const SUB_COUNT: &str = "sub_cnt";

#[contractimpl]
impl SubscriptionContract {

    // ──────────────────────────────────────────────
    // ADMIN
    // ──────────────────────────────────────────────

    /// Initialize the protocol. Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_bps: u32,
        fee_collector: Address,
    ) -> Result<(), PayCycleError> {
        // TODO: Yellow Belt — Implement
        // - Check not already initialized
        // - Store admin, fee_bps, fee_collector
        // - Initialize plan_count and sub_count to 0
        todo!()
    }

    // ──────────────────────────────────────────────
    // MERCHANT FUNCTIONS
    // ──────────────────────────────────────────────

    /// Merchant creates a subscription plan
    pub fn create_plan(
        env: Env,
        merchant: Address,
        token: Address,
        amount: i128,
        interval: u64,
        name: String,
    ) -> Result<u64, PayCycleError> {
        // TODO: Yellow Belt — Implement
        // - Require merchant auth
        // - Validate amount > 0, interval >= 3600 (1 hour minimum)
        // - Create PlanData, store it
        // - Increment plan_count, return plan_id
        // - Emit PlanCreated event
        todo!()
    }

    // ──────────────────────────────────────────────
    // SUBSCRIBER FUNCTIONS
    // ──────────────────────────────────────────────

    /// User subscribes to a plan (pre-authorizes recurring debit)
    pub fn subscribe(
        env: Env,
        subscriber: Address,
        plan_id: u64,
        max_amount: i128,
    ) -> Result<u64, PayCycleError> {
        // TODO: Yellow Belt — Implement
        // - Require subscriber auth
        // - Verify plan exists and is active
        // - max_amount must be >= plan amount
        // - Create SubscriptionData, store it
        // - Increment subscriber_count on plan
        // - Increment sub_count, return subscription_id
        // - Emit Subscribed event
        todo!()
    }

    /// Cancel a subscription (subscriber only)
    pub fn cancel(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        // TODO: Yellow Belt — Implement
        // - Require subscriber auth
        // - Verify subscription exists and belongs to subscriber
        // - Set status to Cancelled
        // - Decrement plan subscriber_count
        // - Emit SubscriptionCancelled event
        todo!()
    }

    /// Pause a subscription (subscriber only)
    pub fn pause(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        // TODO: Yellow Belt — Implement
        todo!()
    }

    /// Resume a paused subscription (subscriber only)
    pub fn resume(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        // TODO: Yellow Belt — Implement
        todo!()
    }

    // ──────────────────────────────────────────────
    // PAYMENT EXECUTION
    // ──────────────────────────────────────────────

    /// Execute a scheduled payment (callable by anyone — keeper or merchant)
    pub fn execute_payment(
        env: Env,
        subscription_id: u64,
    ) -> Result<bool, PayCycleError> {
        // TODO: Yellow Belt — Implement
        // - Verify subscription is active
        // - Verify current time >= next_payment timestamp
        // - Verify plan is active
        // - Calculate amount (plan amount, capped by max_amount)
        // - Deduct protocol fee (fee_bps)
        // - Transfer tokens: subscriber → merchant (net of fee)
        // - Transfer fee: subscriber → fee_collector
        // - Update last_payment, next_payment, payments_made
        // - Emit PaymentExecuted event
        // - Return true if successful
        todo!()
    }

    // ──────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ──────────────────────────────────────────────

    pub fn get_plan(env: Env, plan_id: u64) -> Result<PlanData, PayCycleError> {
        // TODO: Yellow Belt
        todo!()
    }

    pub fn get_subscription(env: Env, subscription_id: u64) -> Result<SubscriptionData, PayCycleError> {
        // TODO: Yellow Belt
        todo!()
    }

    pub fn get_user_subscriptions(env: Env, user: Address) -> Vec<u64> {
        // TODO: Orange Belt
        todo!()
    }

    pub fn get_plan_subscribers(env: Env, plan_id: u64) -> Vec<u64> {
        // TODO: Orange Belt
        todo!()
    }

    pub fn get_plan_count(env: Env) -> u64 {
        // TODO: Yellow Belt
        todo!()
    }

    pub fn get_sub_count(env: Env) -> u64 {
        // TODO: Yellow Belt
        todo!()
    }
}

#[cfg(test)]
mod test;
