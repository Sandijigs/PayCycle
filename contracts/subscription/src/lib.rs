#![no_std]

pub mod types;
pub mod errors;
pub mod events;

use soroban_sdk::{contract, contractimpl, token, Address, Env, String, Vec};
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

/// Helper functions for composite storage keys
fn plan_key(id: u64) -> (&'static str, u64) {
    ("plan", id)
}

fn sub_key(id: u64) -> (&'static str, u64) {
    ("sub", id)
}

fn user_subs_key(user: &Address) -> (&'static str, Address) {
    ("user_subs", user.clone())
}

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
        // Check not already initialized
        if env.storage().instance().has(&ADMIN) {
            return Err(PayCycleError::AlreadyInitialized);
        }

        // Store configuration
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&FEE_BPS, &fee_bps);
        env.storage().instance().set(&FEE_COLLECTOR, &fee_collector);

        // Initialize counters
        env.storage().instance().set(&PLAN_COUNT, &0u64);
        env.storage().instance().set(&SUB_COUNT, &0u64);

        Ok(())
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
        // Require merchant authorization
        merchant.require_auth();

        // Validate parameters
        if amount <= 0 {
            return Err(PayCycleError::AmountTooLow);
        }
        if interval < 3600 {
            return Err(PayCycleError::IntervalTooShort);
        }

        // Get and increment plan count
        let plan_count: u64 = env.storage().instance().get(&PLAN_COUNT).unwrap_or(0);
        let plan_id = plan_count + 1;

        // Create plan data
        let plan = PlanData {
            merchant,
            token,
            amount,
            interval,
            name,
            status: PlanStatus::Active,
            subscriber_count: 0,
            created_at: env.ledger().timestamp(),
        };

        // Store plan
        env.storage().instance().set(&plan_key(plan_id), &plan);
        env.storage().instance().set(&PLAN_COUNT, &plan_id);

        events::emit_plan_created(&env, plan_id, &plan.merchant);
        Ok(plan_id)
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
        // Require subscriber authorization
        subscriber.require_auth();

        // Load and verify plan
        let mut plan: PlanData = env.storage().instance().get(&plan_key(plan_id))
            .ok_or(PayCycleError::PlanNotFound)?;

        if plan.status != PlanStatus::Active {
            return Err(PayCycleError::PlanInactive);
        }

        // Verify max_amount is sufficient
        if max_amount < plan.amount {
            return Err(PayCycleError::ExceedsSpendingCap);
        }

        // Get and increment subscription count
        let sub_count: u64 = env.storage().instance().get(&SUB_COUNT).unwrap_or(0);
        let subscription_id = sub_count + 1;

        // Create subscription data
        let current_time = env.ledger().timestamp();
        let subscription = SubscriptionData {
            subscriber: subscriber.clone(),
            plan_id,
            max_amount,
            status: SubscriptionStatus::Active,
            last_payment: 0,
            next_payment: current_time + plan.interval,
            payments_made: 0,
            created_at: current_time,
        };

        // Store subscription
        env.storage().instance().set(&sub_key(subscription_id), &subscription);
        env.storage().instance().set(&SUB_COUNT, &subscription_id);

        // Add subscription ID to user's list
        let user_key = user_subs_key(&subscriber);
        let mut user_subs: Vec<u64> = env.storage().instance().get(&user_key).unwrap_or(Vec::new(&env));
        user_subs.push_back(subscription_id);
        env.storage().instance().set(&user_key, &user_subs);

        // Increment plan's subscriber count
        plan.subscriber_count += 1;
        env.storage().instance().set(&plan_key(plan_id), &plan);

        events::emit_subscribed(&env, subscription_id, &subscriber, plan_id);
        Ok(subscription_id)
    }

    /// Cancel a subscription (subscriber only)
    pub fn cancel(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        // Require subscriber authorization
        subscriber.require_auth();

        // Load subscription
        let mut subscription: SubscriptionData = env.storage().instance().get(&sub_key(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        // Verify ownership
        if subscription.subscriber != subscriber {
            return Err(PayCycleError::NotAuthorized);
        }

        // Update subscription status
        subscription.status = SubscriptionStatus::Cancelled;
        env.storage().instance().set(&sub_key(subscription_id), &subscription);

        events::emit_subscription_cancelled(&env, subscription_id);

        // Decrement plan's subscriber count
        let mut plan: PlanData = env.storage().instance().get(&plan_key(subscription.plan_id))
            .ok_or(PayCycleError::PlanNotFound)?;
        if plan.subscriber_count > 0 {
            plan.subscriber_count -= 1;
        }
        env.storage().instance().set(&plan_key(subscription.plan_id), &plan);

        Ok(())
    }

    /// Pause a subscription (subscriber only)
    pub fn pause(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        // Require subscriber authorization
        subscriber.require_auth();

        // Load subscription
        let mut subscription: SubscriptionData = env.storage().instance().get(&sub_key(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        // Verify ownership
        if subscription.subscriber != subscriber {
            return Err(PayCycleError::NotAuthorized);
        }

        // Verify current status is Active
        if subscription.status != SubscriptionStatus::Active {
            return Err(PayCycleError::InvalidStatus);
        }

        // Update status to Paused
        subscription.status = SubscriptionStatus::Paused;
        env.storage().instance().set(&sub_key(subscription_id), &subscription);

        events::emit_subscription_paused(&env, subscription_id);
        Ok(())
    }

    /// Resume a paused subscription (subscriber only)
    pub fn resume(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        // Require subscriber authorization
        subscriber.require_auth();

        // Load subscription
        let mut subscription: SubscriptionData = env.storage().instance().get(&sub_key(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        // Verify ownership
        if subscription.subscriber != subscriber {
            return Err(PayCycleError::NotAuthorized);
        }

        // Verify current status is Paused
        if subscription.status != SubscriptionStatus::Paused {
            return Err(PayCycleError::InvalidStatus);
        }

        // Update status to Active and recalculate next payment
        let plan: PlanData = env.storage().instance().get(&plan_key(subscription.plan_id))
            .ok_or(PayCycleError::PlanNotFound)?;

        subscription.status = SubscriptionStatus::Active;
        subscription.next_payment = env.ledger().timestamp() + plan.interval;
        env.storage().instance().set(&sub_key(subscription_id), &subscription);

        events::emit_subscription_resumed(&env, subscription_id);
        Ok(())
    }

    // ──────────────────────────────────────────────
    // PAYMENT EXECUTION
    // ──────────────────────────────────────────────

    /// Execute a scheduled payment (callable by anyone — keeper or merchant)
    pub fn execute_payment(
        env: Env,
        subscription_id: u64,
    ) -> Result<bool, PayCycleError> {
        // Load subscription
        let mut subscription: SubscriptionData = env.storage().instance().get(&sub_key(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        // Verify subscription is active
        if subscription.status != SubscriptionStatus::Active {
            return Err(PayCycleError::InvalidStatus);
        }

        // Verify payment is due
        let current_time = env.ledger().timestamp();
        if current_time < subscription.next_payment {
            return Err(PayCycleError::PaymentNotDue);
        }

        // Load plan
        let plan: PlanData = env.storage().instance().get(&plan_key(subscription.plan_id))
            .ok_or(PayCycleError::PlanNotFound)?;

        if plan.status != PlanStatus::Active {
            return Err(PayCycleError::PlanInactive);
        }

        // Verify amount doesn't exceed spending cap
        if plan.amount > subscription.max_amount {
            return Err(PayCycleError::ExceedsSpendingCap);
        }

        // Get fee configuration
        let fee_bps: u32 = env.storage().instance().get(&FEE_BPS).unwrap_or(0);
        let fee_collector: Address = env.storage().instance().get(&FEE_COLLECTOR)
            .ok_or(PayCycleError::NotAuthorized)?;

        // Calculate fee
        let fee_amount = (plan.amount * fee_bps as i128) / 10000;
        let net_amount = plan.amount - fee_amount;

        // Get contract address for transfer_from
        let contract_address = env.current_contract_address();

        // Create token client
        let token_client = token::Client::new(&env, &plan.token);

        // Transfer net amount to merchant
        token_client.transfer_from(
            &contract_address,
            &subscription.subscriber,
            &plan.merchant,
            &net_amount,
        );

        // Transfer fee to fee collector (if fee > 0)
        if fee_amount > 0 {
            token_client.transfer_from(
                &contract_address,
                &subscription.subscriber,
                &fee_collector,
                &fee_amount,
            );
        }

        // Update subscription
        subscription.last_payment = current_time;
        subscription.next_payment = current_time + plan.interval;
        subscription.payments_made += 1;
        env.storage().instance().set(&sub_key(subscription_id), &subscription);

        events::emit_payment_executed(&env, subscription_id, plan.amount);
        Ok(true)
    }

    // ──────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ──────────────────────────────────────────────

    pub fn get_plan(env: Env, plan_id: u64) -> Result<PlanData, PayCycleError> {
        env.storage().instance().get(&plan_key(plan_id))
            .ok_or(PayCycleError::PlanNotFound)
    }

    pub fn get_subscription(env: Env, subscription_id: u64) -> Result<SubscriptionData, PayCycleError> {
        env.storage().instance().get(&sub_key(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)
    }

    pub fn get_user_subscriptions(env: Env, user: Address) -> Vec<u64> {
        env.storage().instance().get(&user_subs_key(&user))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_plan_subscribers(env: Env, _plan_id: u64) -> Vec<u64> {
        // TODO: Orange Belt — Would need to track this in subscribe/cancel
        // For now, return empty vector
        Vec::new(&env)
    }

    pub fn get_plan_count(env: Env) -> u64 {
        env.storage().instance().get(&PLAN_COUNT).unwrap_or(0)
    }

    pub fn get_sub_count(env: Env) -> u64 {
        env.storage().instance().get(&SUB_COUNT).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
