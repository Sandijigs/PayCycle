#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

/// Helper: deploy and initialize PLC token, returns (env, client, admin)
fn setup() -> (Env, PayCycleTokenClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayCycleToken);
    let client = PayCycleTokenClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(
        &admin,
        &7u32,
        &String::from_str(&env, "PayCycle Token"),
        &String::from_str(&env, "PLC"),
    );

    (env, client, admin)
}

// ──────────────────────────────────────────────
// METADATA
// ──────────────────────────────────────────────

#[test]
fn test_metadata() {
    let (env, client, _admin) = setup();

    assert_eq!(client.decimals(), 7);
    assert_eq!(client.name(), String::from_str(&env, "PayCycle Token"));
    assert_eq!(client.symbol(), String::from_str(&env, "PLC"));
}

// ──────────────────────────────────────────────
// MINT
// ──────────────────────────────────────────────

#[test]
fn test_mint() {
    let (env, client, _admin) = setup();
    let user = Address::generate(&env);

    // Mint to user
    client.mint(&user, &1_000_0000000); // 1000 PLC (7 decimals)
    assert_eq!(client.balance(&user), 1_000_0000000);

    // Mint again — should accumulate
    client.mint(&user, &500_0000000);
    assert_eq!(client.balance(&user), 1_500_0000000);
}

#[test]
fn test_mint_to_multiple_users() {
    let (env, client, _admin) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100_0000000);
    client.mint(&bob, &200_0000000);

    assert_eq!(client.balance(&alice), 100_0000000);
    assert_eq!(client.balance(&bob), 200_0000000);
}

#[test]
#[should_panic(expected = "mint amount must be positive")]
fn test_mint_zero_fails() {
    let (env, client, _admin) = setup();
    let user = Address::generate(&env);
    client.mint(&user, &0);
}

// ──────────────────────────────────────────────
// TRANSFER
// ──────────────────────────────────────────────

#[test]
fn test_transfer() {
    let (env, client, _admin) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Mint initial balance
    client.mint(&alice, &1_000_0000000);

    // Transfer from alice to bob
    client.transfer(&alice, &bob, &300_0000000);

    assert_eq!(client.balance(&alice), 700_0000000);
    assert_eq!(client.balance(&bob), 300_0000000);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_transfer_insufficient_balance() {
    let (env, client, _admin) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100_0000000);
    client.transfer(&alice, &bob, &200_0000000); // More than balance
}

// ──────────────────────────────────────────────
// APPROVE + TRANSFER_FROM
// ──────────────────────────────────────────────

#[test]
fn test_approve_and_transfer_from() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Mint tokens to owner
    client.mint(&owner, &1_000_0000000);

    // Owner approves spender
    let expiry = env.ledger().sequence() + 1000;
    client.approve(&owner, &spender, &500_0000000, &expiry);
    assert_eq!(client.allowance(&owner, &spender), 500_0000000);

    // Spender transfers from owner to recipient
    client.transfer_from(&spender, &owner, &recipient, &200_0000000);

    assert_eq!(client.balance(&owner), 800_0000000);
    assert_eq!(client.balance(&recipient), 200_0000000);
    assert_eq!(client.allowance(&owner, &spender), 300_0000000); // 500 - 200
}

#[test]
#[should_panic(expected = "insufficient allowance")]
fn test_transfer_from_exceeds_allowance() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&owner, &1_000_0000000);

    let expiry = env.ledger().sequence() + 1000;
    client.approve(&owner, &spender, &100_0000000, &expiry);

    // Try to transfer more than allowance
    client.transfer_from(&spender, &owner, &recipient, &200_0000000);
}

// ──────────────────────────────────────────────
// BURN
// ──────────────────────────────────────────────

#[test]
fn test_burn() {
    let (env, client, _admin) = setup();
    let user = Address::generate(&env);

    client.mint(&user, &500_0000000);
    client.burn(&user, &200_0000000);

    assert_eq!(client.balance(&user), 300_0000000);
}

#[test]
fn test_burn_from() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);

    client.mint(&owner, &500_0000000);

    let expiry = env.ledger().sequence() + 1000;
    client.approve(&owner, &spender, &300_0000000, &expiry);

    client.burn_from(&spender, &owner, &200_0000000);

    assert_eq!(client.balance(&owner), 300_0000000);
    assert_eq!(client.allowance(&owner, &spender), 100_0000000); // 300 - 200
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

#[test]
fn test_set_admin() {
    let (env, client, _admin) = setup();
    let new_admin = Address::generate(&env);
    let user = Address::generate(&env);

    // Transfer admin
    client.set_admin(&new_admin);

    // New admin can mint
    client.mint(&user, &100_0000000);
    assert_eq!(client.balance(&user), 100_0000000);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_fails() {
    let (env, client, _admin) = setup();
    let admin2 = Address::generate(&env);
    client.initialize(
        &admin2,
        &7u32,
        &String::from_str(&env, "Fake"),
        &String::from_str(&env, "FAKE"),
    );
}

#[test]
fn test_zero_balance_default() {
    let (env, client, _admin) = setup();
    let nobody = Address::generate(&env);
    assert_eq!(client.balance(&nobody), 0);
}
