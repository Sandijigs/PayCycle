#![no_std]

// Keeper Contract — Payment Execution + Inter-Contract Calls
//
// Orchestrates subscription payments and PLC reward distribution.
// Each execute_and_reward call makes 5 inter-contract calls:
//   subscription.get_subscription → subscription.get_plan →
//   subscription.execute_payment → plc_token.mint(subscriber) →
//   plc_token.mint(merchant)

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, vec, Address, Env, IntoVal, String, Symbol, Vec,
};

// ──────────────────────────────────────────────
// TYPES (mirrored from subscription contract for cross-contract deserialization)
// ──────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum PlanStatus {
    Active,
    Paused,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone)]
pub struct PlanData {
    pub merchant: Address,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,
    pub name: String,
    pub status: PlanStatus,
    pub subscriber_count: u32,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct SubscriptionData {
    pub subscriber: Address,
    pub plan_id: u64,
    pub max_amount: i128,
    pub status: SubscriptionStatus,
    pub last_payment: u64,
    pub next_payment: u64,
    pub payments_made: u32,
    pub created_at: u64,
}

// ──────────────────────────────────────────────
// STORAGE
// ──────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    SubContract,
    PlcToken,
    SubReward,
    MerchReward,
}

// ──────────────────────────────────────────────
// CONTRACT
// ──────────────────────────────────────────────

#[contract]
pub struct KeeperContract;

#[contractimpl]
impl KeeperContract {
    /// Initialize the keeper with contract addresses and reward amounts.
    pub fn initialize(
        env: Env,
        admin: Address,
        subscription_contract: Address,
        plc_token: Address,
        subscriber_reward: i128,
        merchant_reward: i128,
    ) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "already initialized"
        );
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::SubContract, &subscription_contract);
        env.storage()
            .instance()
            .set(&DataKey::PlcToken, &plc_token);
        env.storage()
            .instance()
            .set(&DataKey::SubReward, &subscriber_reward);
        env.storage()
            .instance()
            .set(&DataKey::MerchReward, &merchant_reward);
    }

    /// Execute a subscription payment and mint PLC rewards to both parties.
    ///
    /// Makes 5 inter-contract calls:
    ///   1. subscription.get_subscription() — read subscriber + plan_id
    ///   2. subscription.get_plan()         — read merchant address
    ///   3. subscription.execute_payment()  — transfer payment tokens
    ///   4. plc_token.mint(subscriber)      — reward subscriber with PLC
    ///   5. plc_token.mint(merchant)        — reward merchant with PLC
    pub fn execute_and_reward(env: Env, subscription_id: u64) -> bool {
        let sub_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::SubContract)
            .unwrap();
        let plc_token: Address = env.storage().instance().get(&DataKey::PlcToken).unwrap();
        let sub_reward: i128 = env.storage().instance().get(&DataKey::SubReward).unwrap();
        let merch_reward: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MerchReward)
            .unwrap();

        // ── INTER-CONTRACT CALL 1: Get subscription data ──
        let subscription: SubscriptionData = env.invoke_contract(
            &sub_contract,
            &Symbol::new(&env, "get_subscription"),
            vec![&env, subscription_id.into_val(&env)],
        );

        // ── INTER-CONTRACT CALL 2: Get plan data (for merchant address) ──
        let plan: PlanData = env.invoke_contract(
            &sub_contract,
            &Symbol::new(&env, "get_plan"),
            vec![&env, subscription.plan_id.into_val(&env)],
        );

        // ── INTER-CONTRACT CALL 3: Execute the payment ──
        let _success: bool = env.invoke_contract(
            &sub_contract,
            &Symbol::new(&env, "execute_payment"),
            vec![&env, subscription_id.into_val(&env)],
        );

        // ── INTER-CONTRACT CALL 4: Mint PLC reward to subscriber ──
        env.invoke_contract::<soroban_sdk::Val>(
            &plc_token,
            &Symbol::new(&env, "mint"),
            vec![
                &env,
                subscription.subscriber.into_val(&env),
                sub_reward.into_val(&env),
            ],
        );

        // ── INTER-CONTRACT CALL 5: Mint PLC reward to merchant ──
        env.invoke_contract::<soroban_sdk::Val>(
            &plc_token,
            &Symbol::new(&env, "mint"),
            vec![
                &env,
                plan.merchant.into_val(&env),
                merch_reward.into_val(&env),
            ],
        );

        true
    }

    /// Batch-execute multiple subscription payments with rewards.
    /// Atomic: if any payment fails, the entire batch reverts.
    pub fn batch_execute(env: Env, subscription_ids: Vec<u64>) -> u32 {
        let mut count: u32 = 0;
        for id in subscription_ids.iter() {
            Self::execute_and_reward(env.clone(), id);
            count += 1;
        }
        count
    }

    // ──────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ──────────────────────────────────────────────

    pub fn get_config(
        env: Env,
    ) -> (Address, Address, Address, i128, i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let sub_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::SubContract)
            .unwrap();
        let plc_token: Address = env.storage().instance().get(&DataKey::PlcToken).unwrap();
        let sub_reward: i128 = env.storage().instance().get(&DataKey::SubReward).unwrap();
        let merch_reward: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MerchReward)
            .unwrap();
        (admin, sub_contract, plc_token, sub_reward, merch_reward)
    }
}
