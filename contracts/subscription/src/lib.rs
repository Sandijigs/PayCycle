#![no_std]

mod types;
mod errors;
mod events;

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, token};
use types::*;
use errors::PayCycleError;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    FeeBps,
    FeeCollector,
    PlanCount,
    SubCount,
    Plan(u64),
    Sub(u64),
}

#[contract]
pub struct SubscriptionContract;

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
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(PayCycleError::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage().instance().set(&DataKey::FeeCollector, &fee_collector);
        env.storage().instance().set(&DataKey::PlanCount, &0u64);
        env.storage().instance().set(&DataKey::SubCount, &0u64);

        env.storage().instance().extend_ttl(100, 100);

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
        merchant.require_auth();

        if amount <= 0 {
            return Err(PayCycleError::AmountTooLow);
        }
        if interval < 3600 {
            return Err(PayCycleError::IntervalTooShort);
        }

        let plan_count: u64 = env.storage().instance().get(&DataKey::PlanCount).unwrap_or(0);
        let plan_id = plan_count + 1;

        let plan = PlanData {
            merchant: merchant.clone(),
            token,
            amount,
            interval,
            name,
            status: PlanStatus::Active,
            subscriber_count: 0,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Plan(plan_id), &plan);
        env.storage().persistent().extend_ttl(&DataKey::Plan(plan_id), 100, 100);

        env.storage().instance().set(&DataKey::PlanCount, &plan_id);
        env.storage().instance().extend_ttl(100, 100);

        events::emit_plan_created(&env, plan_id, &merchant);

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
        subscriber.require_auth();

        let mut plan: PlanData = env.storage().persistent()
            .get(&DataKey::Plan(plan_id))
            .ok_or(PayCycleError::PlanNotFound)?;

        if plan.status != PlanStatus::Active {
            return Err(PayCycleError::PlanInactive);
        }

        if max_amount < plan.amount {
            return Err(PayCycleError::ExceedsSpendingCap);
        }

        let sub_count: u64 = env.storage().instance().get(&DataKey::SubCount).unwrap_or(0);
        let sub_id = sub_count + 1;

        let now = env.ledger().timestamp();
        let subscription = SubscriptionData {
            subscriber: subscriber.clone(),
            plan_id,
            max_amount,
            status: SubscriptionStatus::Active,
            last_payment: 0,
            next_payment: now,
            payments_made: 0,
            created_at: now,
        };

        env.storage().persistent().set(&DataKey::Sub(sub_id), &subscription);
        env.storage().persistent().extend_ttl(&DataKey::Sub(sub_id), 100, 100);

        plan.subscriber_count += 1;
        env.storage().persistent().set(&DataKey::Plan(plan_id), &plan);
        env.storage().persistent().extend_ttl(&DataKey::Plan(plan_id), 100, 100);

        env.storage().instance().set(&DataKey::SubCount, &sub_id);
        env.storage().instance().extend_ttl(100, 100);

        events::emit_subscribed(&env, sub_id, &subscriber, plan_id);

        Ok(sub_id)
    }

    /// Cancel a subscription (subscriber only)
    pub fn cancel(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        subscriber.require_auth();

        let mut sub: SubscriptionData = env.storage().persistent()
            .get(&DataKey::Sub(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        if sub.subscriber != subscriber {
            return Err(PayCycleError::NotAuthorized);
        }

        if sub.status == SubscriptionStatus::Cancelled {
            return Err(PayCycleError::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Sub(subscription_id), &sub);

        let mut plan: PlanData = env.storage().persistent()
            .get(&DataKey::Plan(sub.plan_id)).unwrap();
        plan.subscriber_count = plan.subscriber_count.saturating_sub(1);
        env.storage().persistent().set(&DataKey::Plan(sub.plan_id), &plan);

        events::emit_subscription_cancelled(&env, subscription_id);

        Ok(())
    }

    /// Pause a subscription (subscriber only)
    pub fn pause(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        subscriber.require_auth();

        let mut sub: SubscriptionData = env.storage().persistent()
            .get(&DataKey::Sub(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        if sub.subscriber != subscriber {
            return Err(PayCycleError::NotAuthorized);
        }

        if sub.status != SubscriptionStatus::Active {
            return Err(PayCycleError::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Paused;
        env.storage().persistent().set(&DataKey::Sub(subscription_id), &sub);

        events::emit_subscription_paused(&env, subscription_id);

        Ok(())
    }

    /// Resume a paused subscription (subscriber only)
    pub fn resume(
        env: Env,
        subscriber: Address,
        subscription_id: u64,
    ) -> Result<(), PayCycleError> {
        subscriber.require_auth();

        let mut sub: SubscriptionData = env.storage().persistent()
            .get(&DataKey::Sub(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        if sub.subscriber != subscriber {
            return Err(PayCycleError::NotAuthorized);
        }

        if sub.status != SubscriptionStatus::Paused {
            return Err(PayCycleError::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Active;
        env.storage().persistent().set(&DataKey::Sub(subscription_id), &sub);

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
        let mut sub: SubscriptionData = env.storage().persistent()
            .get(&DataKey::Sub(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)?;

        if sub.status != SubscriptionStatus::Active {
            return Err(PayCycleError::InvalidStatus);
        }

        let now = env.ledger().timestamp();
        if now < sub.next_payment {
            return Err(PayCycleError::PaymentNotDue);
        }

        let plan: PlanData = env.storage().persistent()
            .get(&DataKey::Plan(sub.plan_id))
            .ok_or(PayCycleError::PlanNotFound)?;

        if plan.status != PlanStatus::Active {
            return Err(PayCycleError::PlanInactive);
        }

        // Cap payment at subscriber's max_amount
        let payment_amount = if plan.amount > sub.max_amount {
            sub.max_amount
        } else {
            plan.amount
        };

        // Calculate protocol fee
        let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0);
        let fee = (payment_amount * fee_bps as i128) / 10_000i128;
        let merchant_amount = payment_amount - fee;

        // Transfer tokens via allowance (subscriber pre-approved the contract)
        let contract_addr = env.current_contract_address();
        let token_client = token::Client::new(&env, &plan.token);
        token_client.transfer_from(&contract_addr, &sub.subscriber, &plan.merchant, &merchant_amount);

        if fee > 0 {
            let fee_collector: Address = env.storage().instance()
                .get(&DataKey::FeeCollector).unwrap();
            token_client.transfer_from(&contract_addr, &sub.subscriber, &fee_collector, &fee);
        }

        // Update subscription state
        sub.last_payment = now;
        sub.next_payment = now + plan.interval;
        sub.payments_made += 1;

        env.storage().persistent().set(&DataKey::Sub(subscription_id), &sub);
        env.storage().persistent().extend_ttl(&DataKey::Sub(subscription_id), 100, 100);
        env.storage().instance().extend_ttl(100, 100);

        events::emit_payment_executed(&env, subscription_id, payment_amount);

        Ok(true)
    }

    // ──────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ──────────────────────────────────────────────

    pub fn get_plan(env: Env, plan_id: u64) -> Result<PlanData, PayCycleError> {
        env.storage().persistent()
            .get(&DataKey::Plan(plan_id))
            .ok_or(PayCycleError::PlanNotFound)
    }

    pub fn get_subscription(env: Env, subscription_id: u64) -> Result<SubscriptionData, PayCycleError> {
        env.storage().persistent()
            .get(&DataKey::Sub(subscription_id))
            .ok_or(PayCycleError::SubscriptionNotFound)
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
        env.storage().instance().get(&DataKey::PlanCount).unwrap_or(0)
    }

    pub fn get_sub_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::SubCount).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
