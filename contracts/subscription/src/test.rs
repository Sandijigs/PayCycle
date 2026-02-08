#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, Env, String, token};

/// Shared test setup: registers contract + test token, initializes, mints tokens to subscriber.
fn setup() -> (
    Env,
    SubscriptionContractClient<'static>,
    Address,   // token_id
    Address,   // merchant
    Address,   // subscriber
    Address,   // fee_collector
) {
    let env = Env::default();
    env.mock_all_auths();

    // Set a non-zero ledger timestamp
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });

    // Register subscription contract
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    // Register a test token
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    // Create test addresses
    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);
    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);

    // Initialize contract with 0.5% fee
    client.initialize(&admin, &50u32, &fee_collector);

    // Mint tokens to subscriber
    token_admin_client.mint(&subscriber, &1_000_000_0000000i128);

    // Approve contract to spend subscriber's tokens (pre-authorized debit)
    let token_client = token::Client::new(&env, &token_id);
    token_client.approve(&subscriber, &contract_id, &1_000_000_0000000i128, &1_000_000u32);

    (env, client, token_id, merchant, subscriber, fee_collector)
}

// ──────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    // First init should succeed
    client.initialize(&admin, &50u32, &fee_collector);
    assert_eq!(client.get_plan_count(), 0);
    assert_eq!(client.get_sub_count(), 0);

    // Second init should fail with AlreadyInitialized
    let result = client.try_initialize(&admin, &50u32, &fee_collector);
    assert!(result.is_err());
}

#[test]
fn test_create_plan() {
    let (env, client, token_id, merchant, _, _) = setup();

    let plan_id = client.create_plan(
        &merchant,
        &token_id,
        &10_0000000i128,
        &(30 * 24 * 3600u64),
        &String::from_str(&env, "Premium Monthly"),
    );

    assert_eq!(plan_id, 1);
    assert_eq!(client.get_plan_count(), 1);

    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.merchant, merchant);
    assert_eq!(plan.amount, 10_0000000i128);
    assert_eq!(plan.interval, 30 * 24 * 3600);
    assert_eq!(plan.status, PlanStatus::Active);
    assert_eq!(plan.subscriber_count, 0);
}

#[test]
fn test_subscribe() {
    let (env, client, token_id, merchant, subscriber, _) = setup();

    let plan_id = client.create_plan(
        &merchant,
        &token_id,
        &10_0000000i128,
        &3600u64,
        &String::from_str(&env, "Hourly Plan"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id, &15_0000000i128);

    assert_eq!(sub_id, 1);
    assert_eq!(client.get_sub_count(), 1);

    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.subscriber, subscriber);
    assert_eq!(sub.plan_id, plan_id);
    assert_eq!(sub.max_amount, 15_0000000i128);
    assert_eq!(sub.status, SubscriptionStatus::Active);
    assert_eq!(sub.payments_made, 0);

    // Verify plan subscriber count incremented
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.subscriber_count, 1);
}

#[test]
fn test_execute_payment() {
    let (env, client, token_id, merchant, subscriber, fee_collector) = setup();

    let plan_amount = 10_0000000i128;
    let plan_id = client.create_plan(
        &merchant,
        &token_id,
        &plan_amount,
        &3600u64,
        &String::from_str(&env, "Hourly"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id, &plan_amount);

    // Record balances before payment
    let token_client = token::Client::new(&env, &token_id);
    let sub_balance_before = token_client.balance(&subscriber);
    let merchant_balance_before = token_client.balance(&merchant);
    let fee_balance_before = token_client.balance(&fee_collector);

    // First payment is due immediately (next_payment = subscribe time)
    let result = client.execute_payment(&sub_id);
    assert_eq!(result, true);

    // fee = 10_0000000 * 50 / 10000 = 50000
    let expected_fee = (plan_amount * 50) / 10_000;
    let expected_merchant = plan_amount - expected_fee;

    assert_eq!(token_client.balance(&subscriber), sub_balance_before - plan_amount);
    assert_eq!(token_client.balance(&merchant), merchant_balance_before + expected_merchant);
    assert_eq!(token_client.balance(&fee_collector), fee_balance_before + expected_fee);

    // Verify subscription state updated
    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.payments_made, 1);
    assert!(sub.last_payment > 0);
    assert!(sub.next_payment > sub.last_payment);
}

#[test]
fn test_cancel_subscription() {
    let (env, client, token_id, merchant, subscriber, _) = setup();

    let plan_id = client.create_plan(
        &merchant, &token_id, &10_0000000i128, &3600u64,
        &String::from_str(&env, "Test"),
    );
    let sub_id = client.subscribe(&subscriber, &plan_id, &10_0000000i128);

    client.cancel(&subscriber, &sub_id);

    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.status, SubscriptionStatus::Cancelled);

    // Verify plan subscriber count decremented
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.subscriber_count, 0);

    // Execute payment should fail on cancelled subscription
    let result = client.try_execute_payment(&sub_id);
    assert!(result.is_err());
}

#[test]
fn test_pause_resume() {
    let (env, client, token_id, merchant, subscriber, _) = setup();

    let plan_id = client.create_plan(
        &merchant, &token_id, &10_0000000i128, &3600u64,
        &String::from_str(&env, "Test"),
    );
    let sub_id = client.subscribe(&subscriber, &plan_id, &10_0000000i128);

    // Pause
    client.pause(&subscriber, &sub_id);
    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.status, SubscriptionStatus::Paused);

    // Execute payment should fail when paused
    let result = client.try_execute_payment(&sub_id);
    assert!(result.is_err());

    // Resume
    client.resume(&subscriber, &sub_id);
    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.status, SubscriptionStatus::Active);

    // Execute payment should succeed after resume
    let result = client.execute_payment(&sub_id);
    assert_eq!(result, true);
}

#[test]
fn test_payment_not_due() {
    let (env, client, token_id, merchant, subscriber, _) = setup();

    let interval = 3600u64;
    let plan_id = client.create_plan(
        &merchant, &token_id, &10_0000000i128, &interval,
        &String::from_str(&env, "Test"),
    );
    let sub_id = client.subscribe(&subscriber, &plan_id, &10_0000000i128);

    // First payment succeeds (due immediately)
    client.execute_payment(&sub_id);

    // Second payment immediately should fail (not due)
    let result = client.try_execute_payment(&sub_id);
    assert!(result.is_err());

    // Advance time past the interval
    env.ledger().with_mut(|li| {
        li.timestamp += interval + 1;
    });

    // Now the payment should succeed
    let result = client.execute_payment(&sub_id);
    assert_eq!(result, true);

    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.payments_made, 2);
}

#[test]
fn test_spending_cap_enforcement() {
    let (env, client, token_id, merchant, subscriber, _) = setup();

    let plan_id = client.create_plan(
        &merchant, &token_id, &10_0000000i128, &3600u64,
        &String::from_str(&env, "Cap Test"),
    );

    // Subscribe with max_amount = plan amount (10)
    let sub_id = client.subscribe(&subscriber, &plan_id, &10_0000000i128);

    // Simulate plan amount increase by directly writing to storage
    let plan_key = DataKey::Plan(plan_id);
    env.as_contract(&client.address, || {
        let mut plan: PlanData = env.storage().persistent().get(&plan_key).unwrap();
        plan.amount = 20_0000000i128; // Merchant raised price to 20
        env.storage().persistent().set(&plan_key, &plan);
    });

    // Record subscriber balance before payment
    let token_client = token::Client::new(&env, &token_id);
    let balance_before = token_client.balance(&subscriber);

    // Execute payment — should be capped at max_amount (10), not plan amount (20)
    client.execute_payment(&sub_id);

    let expected_payment = 10_0000000i128; // capped at max_amount
    assert_eq!(token_client.balance(&subscriber), balance_before - expected_payment);
}

#[test]
fn test_unauthorized_cancel() {
    let (env, client, token_id, merchant, subscriber, _) = setup();

    let plan_id = client.create_plan(
        &merchant, &token_id, &10_0000000i128, &3600u64,
        &String::from_str(&env, "Test"),
    );
    let sub_id = client.subscribe(&subscriber, &plan_id, &10_0000000i128);

    // Another user tries to cancel — should fail with NotAuthorized
    let attacker = Address::generate(&env);
    let result = client.try_cancel(&attacker, &sub_id);
    assert!(result.is_err());

    // Verify subscription is still active
    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.status, SubscriptionStatus::Active);
}
