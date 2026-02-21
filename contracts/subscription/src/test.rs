#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Address, Env, String};

fn create_test_env() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Set non-zero timestamp (MEMORY.md note)
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    (env, admin, merchant, subscriber, fee_collector)
}

fn setup_token<'a>(env: &'a Env, admin: &'a Address) -> (Address, token::Client<'a>, token::StellarAssetClient<'a>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token_client = token::Client::new(env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(env, &token_address);
    (token_address, token_client, token_admin_client)
}

#[test]
fn test_initialize() {
    let (env, admin, _, _, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    // Initialize with 0.5% fee (50 basis points)
    client.initialize(&admin, &50, &fee_collector);

    // Verify plan and sub counts are 0
    assert_eq!(client.get_plan_count(), 0);
    assert_eq!(client.get_sub_count(), 0);

    // Verify cannot initialize twice
    let result = client.try_initialize(&admin, &100, &fee_collector);
    assert!(result.is_err());
}

#[test]
fn test_create_plan() {
    let (env, admin, merchant, _, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, _, _) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    // Create plan: 10 tokens every 30 days
    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000, // 10 tokens with 7 decimals
        &2_592_000,  // 30 days in seconds
        &plan_name,
    );

    assert_eq!(plan_id, 1);
    assert_eq!(client.get_plan_count(), 1);

    // Verify plan data
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.merchant, merchant);
    assert_eq!(plan.token, token_address);
    assert_eq!(plan.amount, 10_0000000);
    assert_eq!(plan.interval, 2_592_000);
    assert_eq!(plan.subscriber_count, 0);
    assert_eq!(plan.status, PlanStatus::Active);
}

#[test]
fn test_subscribe() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    // Create plan
    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &2_592_000,
        &plan_name,
    );

    // Mint tokens to subscriber
    token_admin_client.mint(&subscriber, &1_000_0000000);

    // Approve contract to spend tokens (CRITICAL from MEMORY.md)
    let max_amount = 15_0000000i128;
    token_client.approve(&subscriber, &contract_id, &max_amount, &1_000_000);

    // Subscribe
    let sub_id = client.subscribe(&subscriber, &plan_id, &max_amount);

    assert_eq!(sub_id, 1);
    assert_eq!(client.get_sub_count(), 1);

    // Verify subscription data
    let subscription = client.get_subscription(&sub_id);
    assert_eq!(subscription.subscriber, subscriber);
    assert_eq!(subscription.plan_id, plan_id);
    assert_eq!(subscription.max_amount, max_amount);
    assert_eq!(subscription.status, SubscriptionStatus::Active);
    assert_eq!(subscription.payments_made, 0);

    // Verify plan subscriber count incremented
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.subscriber_count, 1);

    // Verify user subscriptions list
    let user_subs = client.get_user_subscriptions(&subscriber);
    assert_eq!(user_subs.len(), 1);
    assert_eq!(user_subs.get(0).unwrap(), sub_id);
}

#[test]
fn test_execute_payment() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector); // 0.5% fee

    // Create plan
    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400, // 1 day interval
        &plan_name,
    );

    // Setup subscriber
    token_admin_client.mint(&subscriber, &1_000_0000000);
    let max_amount = 15_0000000i128;
    token_client.approve(&subscriber, &contract_id, &max_amount, &1_000_000);

    let sub_id = client.subscribe(&subscriber, &plan_id, &max_amount);

    // Advance time past payment interval
    env.ledger().with_mut(|li| {
        li.timestamp += 86400; // +1 day
    });

    // Execute payment
    let result = client.execute_payment(&sub_id);
    assert_eq!(result, true);

    // Verify subscription updated
    let subscription = client.get_subscription(&sub_id);
    assert_eq!(subscription.payments_made, 1);
    assert!(subscription.last_payment > 0);

    // Verify token balances
    // Fee: 10 * 0.005 = 0.05 tokens = 500000 stroops (with 7 decimals)
    // Net to merchant: 10 - 0.05 = 9.95 tokens = 99500000 stroops
    assert_eq!(token_client.balance(&merchant), 99500000);
    assert_eq!(token_client.balance(&fee_collector), 500000);
}

#[test]
fn test_cancel_subscription() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &15_0000000, &1_000_000);
    let sub_id = client.subscribe(&subscriber, &plan_id, &15_0000000);

    // Cancel subscription
    client.cancel(&subscriber, &sub_id);

    // Verify status
    let subscription = client.get_subscription(&sub_id);
    assert_eq!(subscription.status, SubscriptionStatus::Cancelled);

    // Verify plan subscriber count decremented
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.subscriber_count, 0);

    // Advance time and try to execute payment - should fail
    env.ledger().with_mut(|li| {
        li.timestamp += 86400;
    });
    let result = client.try_execute_payment(&sub_id);
    assert!(result.is_err());
}

#[test]
fn test_pause_resume() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &15_0000000, &1_000_000);
    let sub_id = client.subscribe(&subscriber, &plan_id, &15_0000000);

    // Pause subscription
    client.pause(&subscriber, &sub_id);

    let subscription = client.get_subscription(&sub_id);
    assert_eq!(subscription.status, SubscriptionStatus::Paused);

    // Advance time and try to execute payment - should fail
    env.ledger().with_mut(|li| {
        li.timestamp += 86400;
    });
    let result = client.try_execute_payment(&sub_id);
    assert!(result.is_err());

    // Resume subscription
    client.resume(&subscriber, &sub_id);

    let subscription = client.get_subscription(&sub_id);
    assert_eq!(subscription.status, SubscriptionStatus::Active);

    // Advance time again past the new next_payment
    env.ledger().with_mut(|li| {
        li.timestamp += 86400;
    });

    // Now payment should succeed
    let result = client.execute_payment(&sub_id);
    assert_eq!(result, true);
}

#[test]
fn test_payment_not_due() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &15_0000000, &1_000_000);
    let sub_id = client.subscribe(&subscriber, &plan_id, &15_0000000);

    // Try to execute immediately - should fail
    let result = client.try_execute_payment(&sub_id);
    assert!(result.is_err());
}

#[test]
fn test_spending_cap_enforcement() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    // Subscribe with max_amount = 10 (same as plan amount)
    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &10_0000000, &1_000_000);
    let _sub_id = client.subscribe(&subscriber, &plan_id, &10_0000000);

    // Merchant tries to increase plan amount - this would be a new plan in reality
    // but to test spending cap, let's try subscribing with too low max_amount
    let plan_name_2 = String::from_str(&env, "Premium");
    let plan_id_2 = client.create_plan(
        &merchant,
        &token_address,
        &20_0000000,
        &86400,
        &plan_name_2,
    );

    // Try to subscribe with max_amount < plan amount - should fail
    let result = client.try_subscribe(&subscriber, &plan_id_2, &10_0000000);
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_cancel() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &15_0000000, &1_000_000);
    let sub_id = client.subscribe(&subscriber, &plan_id, &15_0000000);

    // User B tries to cancel user A's subscription
    let user_b = Address::generate(&env);
    let result = client.try_cancel(&user_b, &sub_id);
    assert!(result.is_err());
}

#[test]
fn test_multiple_subscriptions_same_plan() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    // Subscriber A
    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &15_0000000, &1_000_000);
    let sub_id_a = client.subscribe(&subscriber, &plan_id, &15_0000000);

    // Subscriber B
    let subscriber_b = Address::generate(&env);
    token_admin_client.mint(&subscriber_b, &1_000_0000000);
    token_client.approve(&subscriber_b, &contract_id, &15_0000000, &1_000_000);
    let sub_id_b = client.subscribe(&subscriber_b, &plan_id, &15_0000000);

    // Verify both subscriptions exist
    assert_eq!(sub_id_a, 1);
    assert_eq!(sub_id_b, 2);
    assert_eq!(client.get_sub_count(), 2);

    // Verify plan subscriber count is 2
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.subscriber_count, 2);

    // Verify each user has their own subscription list
    let subs_a = client.get_user_subscriptions(&subscriber);
    let subs_b = client.get_user_subscriptions(&subscriber_b);
    assert_eq!(subs_a.len(), 1);
    assert_eq!(subs_b.len(), 1);
    assert_eq!(subs_a.get(0).unwrap(), sub_id_a);
    assert_eq!(subs_b.get(0).unwrap(), sub_id_b);
}

#[test]
fn test_execute_payment_multiple_cycles() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector); // 0.5% fee

    let plan_name = String::from_str(&env, "Daily Plan");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000, // 10 tokens
        &86400,      // daily
        &plan_name,
    );

    token_admin_client.mint(&subscriber, &1_000_0000000);
    // Approve enough for many cycles
    token_client.approve(&subscriber, &contract_id, &500_0000000, &1_000_000);
    let sub_id = client.subscribe(&subscriber, &plan_id, &15_0000000);

    // Execute 3 consecutive payment cycles
    for cycle in 1..=3u32 {
        env.ledger().with_mut(|li| {
            li.timestamp += 86400; // advance 1 day
        });

        let result = client.execute_payment(&sub_id);
        assert_eq!(result, true);

        let subscription = client.get_subscription(&sub_id);
        assert_eq!(subscription.payments_made, cycle);
    }

    // Verify total amounts after 3 payments
    // Per payment: 10 tokens, fee = 0.05, net = 9.95
    // 3 payments: merchant = 29.85 = 298500000, fee_collector = 0.15 = 1500000
    assert_eq!(token_client.balance(&merchant), 298500000);
    assert_eq!(token_client.balance(&fee_collector), 1500000);

    // Verify subscriber balance decreased by 30 tokens
    assert_eq!(
        token_client.balance(&subscriber),
        1_000_0000000 - 30_0000000
    );
}

#[test]
fn test_cancel_then_resubscribe() {
    let (env, admin, merchant, subscriber, fee_collector) = create_test_env();
    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);
    let (token_address, token_client, token_admin_client) = setup_token(&env, &admin);

    client.initialize(&admin, &50, &fee_collector);

    let plan_name = String::from_str(&env, "Pro Monthly");
    let plan_id = client.create_plan(
        &merchant,
        &token_address,
        &10_0000000,
        &86400,
        &plan_name,
    );

    token_admin_client.mint(&subscriber, &1_000_0000000);
    token_client.approve(&subscriber, &contract_id, &500_0000000, &1_000_000);

    // Subscribe
    let sub_id_1 = client.subscribe(&subscriber, &plan_id, &15_0000000);
    assert_eq!(client.get_plan(&plan_id).subscriber_count, 1);

    // Cancel
    client.cancel(&subscriber, &sub_id_1);
    assert_eq!(client.get_subscription(&sub_id_1).status, SubscriptionStatus::Cancelled);
    assert_eq!(client.get_plan(&plan_id).subscriber_count, 0);

    // Resubscribe (new subscription)
    let sub_id_2 = client.subscribe(&subscriber, &plan_id, &20_0000000);
    assert!(sub_id_2 > sub_id_1); // New subscription ID
    assert_eq!(client.get_subscription(&sub_id_2).status, SubscriptionStatus::Active);
    assert_eq!(client.get_plan(&plan_id).subscriber_count, 1);

    // User should now have 2 subscription IDs in their list
    let user_subs = client.get_user_subscriptions(&subscriber);
    assert_eq!(user_subs.len(), 2);

    // Execute payment on new subscription
    env.ledger().with_mut(|li| {
        li.timestamp += 86400;
    });
    let result = client.execute_payment(&sub_id_2);
    assert_eq!(result, true);

    // Old subscription should still be cancelled
    assert_eq!(client.get_subscription(&sub_id_1).status, SubscriptionStatus::Cancelled);
}
