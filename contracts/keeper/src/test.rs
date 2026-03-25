#![cfg(test)]

use super::*;
use pay_cycle_subscription::SubscriptionContract;
use pay_cycle_token::PayCycleToken;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Address, Env, String};

/// Full integration setup: deploys subscription + PLC token + keeper + payment token.
/// Returns all the pieces needed for assertions.
#[allow(clippy::type_complexity)]
fn setup() -> (
    Env,
    KeeperContractClient<'static>,
    pay_cycle_subscription::SubscriptionContractClient<'static>,
    pay_cycle_token::PayCycleTokenClient<'static>,
    token::Client<'static>,
    Address, // subscriber
    Address, // merchant
    Address, // fee_collector
    u64,     // subscription_id
) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    // ── Deploy all contracts ──
    let sub_id = env.register_contract(None, SubscriptionContract);
    let sub_client =
        pay_cycle_subscription::SubscriptionContractClient::new(&env, &sub_id);

    let plc_id = env.register_contract(None, PayCycleToken);
    let plc_client = pay_cycle_token::PayCycleTokenClient::new(&env, &plc_id);

    let keeper_id = env.register_contract(None, KeeperContract);
    let keeper_client = KeeperContractClient::new(&env, &keeper_id);

    // Payment token (Stellar Asset Contract)
    let pay_addr = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let pay_token = token::Client::new(&env, &pay_addr);
    let pay_admin = token::StellarAssetClient::new(&env, &pay_addr);

    // ── Initialize contracts ──

    // PLC token: keeper is admin (authorized to mint rewards)
    plc_client.initialize(
        &keeper_id,
        &7u32,
        &String::from_str(&env, "PayCycle Token"),
        &String::from_str(&env, "PLC"),
    );

    // Subscription contract
    sub_client.initialize(&admin, &50, &fee_collector); // 0.5% fee

    // Keeper contract
    keeper_client.initialize(
        &admin,
        &sub_id,
        &plc_id,
        &10_0000000,  // 10 PLC subscriber reward per payment
        &5_0000000,   // 5 PLC merchant reward per payment
    );

    // ── Setup scenario ──

    // Fund subscriber with payment tokens
    pay_admin.mint(&subscriber, &10_000_0000000);

    // Create a subscription plan: 100 tokens per hour
    let plan_id = sub_client.create_plan(
        &merchant,
        &pay_addr,
        &100_0000000,
        &3600,
        &String::from_str(&env, "Premium Plan"),
    );

    // Subscribe with 200 token spending cap
    let subscription_id = sub_client.subscribe(&subscriber, &plan_id, &200_0000000);

    // Approve subscription contract to spend subscriber's payment tokens
    let expiry = env.ledger().sequence() + 100_000;
    pay_token.approve(&subscriber, &sub_id, &10_000_0000000, &expiry);

    (
        env,
        keeper_client,
        sub_client,
        plc_client,
        pay_token,
        subscriber,
        merchant,
        fee_collector,
        subscription_id,
    )
}

// ──────────────────────────────────────────────
// EXECUTE AND REWARD (inter-contract calls)
// ──────────────────────────────────────────────

#[test]
fn test_execute_and_reward() {
    let (
        env,
        keeper_client,
        _sub_client,
        plc_client,
        pay_token,
        subscriber,
        merchant,
        fee_collector,
        subscription_id,
    ) = setup();

    // Advance time past the 1-hour payment interval
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000 + 3601;
    });

    // Execute payment + mint rewards via keeper (5 inter-contract calls)
    let result = keeper_client.execute_and_reward(&subscription_id);
    assert!(result);

    // ── Verify payment tokens transferred ──
    // Subscriber paid 100 tokens
    assert_eq!(pay_token.balance(&subscriber), 9_900_0000000);
    // Merchant received 99.5 tokens (100 - 0.5% fee)
    assert_eq!(pay_token.balance(&merchant), 99_5000000);
    // Fee collector received 0.5 tokens
    assert_eq!(pay_token.balance(&fee_collector), 5000000);

    // ── Verify PLC rewards minted (inter-contract calls to token contract) ──
    assert_eq!(plc_client.balance(&subscriber), 10_0000000); // 10 PLC
    assert_eq!(plc_client.balance(&merchant), 5_0000000);    // 5 PLC
}

// ──────────────────────────────────────────────
// CONSECUTIVE REWARDS ACCUMULATE
// ──────────────────────────────────────────────

#[test]
fn test_consecutive_rewards_accumulate() {
    let (
        env,
        keeper_client,
        _sub_client,
        plc_client,
        pay_token,
        subscriber,
        merchant,
        _fee_collector,
        subscription_id,
    ) = setup();

    // First payment
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000 + 3601;
    });
    keeper_client.execute_and_reward(&subscription_id);

    // Second payment (advance another interval)
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000 + 3601 + 3601;
    });
    keeper_client.execute_and_reward(&subscription_id);

    // Subscriber paid 200 tokens total (2 × 100)
    assert_eq!(pay_token.balance(&subscriber), 9_800_0000000);
    // Merchant received 199 tokens total (2 × 99.5)
    assert_eq!(pay_token.balance(&merchant), 199_0000000);

    // PLC rewards accumulated: 2 × 10 = 20 PLC for subscriber, 2 × 5 = 10 PLC for merchant
    assert_eq!(plc_client.balance(&subscriber), 20_0000000);
    assert_eq!(plc_client.balance(&merchant), 10_0000000);
}

// ──────────────────────────────────────────────
// BATCH EXECUTE
// ──────────────────────────────────────────────

#[test]
fn test_batch_execute() {
    let (
        env,
        keeper_client,
        sub_client,
        plc_client,
        pay_token,
        subscriber,
        merchant,
        _fee_collector,
        subscription_id_1,
    ) = setup();

    // Create a second subscription (same subscriber, same plan)
    let subscription_id_2 = sub_client.subscribe(&subscriber, &1, &200_0000000);

    // Advance time past interval
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000 + 3601;
    });

    // Batch execute both subscriptions
    let count = keeper_client.batch_execute(&vec![&env, subscription_id_1, subscription_id_2]);
    assert_eq!(count, 2);

    // Subscriber paid 200 tokens total (2 × 100)
    assert_eq!(pay_token.balance(&subscriber), 9_800_0000000);

    // PLC rewards: 2 payments × (10 + 5) = 20 subscriber + 10 merchant
    assert_eq!(plc_client.balance(&subscriber), 20_0000000);
    assert_eq!(plc_client.balance(&merchant), 10_0000000);
}

// ──────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_fails() {
    let (env, keeper_client, ..) = setup();
    let admin = Address::generate(&env);
    let fake = Address::generate(&env);
    keeper_client.initialize(&admin, &fake, &fake, &1, &1);
}
