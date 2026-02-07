#![allow(unused)]
use soroban_sdk::{contracttype, Address, Env, String};

/// Status of a subscription plan
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PlanStatus {
    Active,
    Paused,
    Cancelled,
}

/// Status of an individual subscription
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
}

/// A recurring payment plan created by a merchant
#[contracttype]
#[derive(Clone, Debug)]
pub struct PlanData {
    pub merchant: Address,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,       // seconds between payments
    pub name: String,
    pub status: PlanStatus,
    pub subscriber_count: u32,
    pub created_at: u64,
}

/// An active subscription linking a subscriber to a plan
#[contracttype]
#[derive(Clone, Debug)]
pub struct SubscriptionData {
    pub subscriber: Address,
    pub plan_id: u64,
    pub max_amount: i128,     // spending cap per interval
    pub status: SubscriptionStatus,
    pub last_payment: u64,    // timestamp of last execution
    pub next_payment: u64,    // timestamp when next payment is due
    pub payments_made: u32,
    pub created_at: u64,
}

// TODO: Implement at Yellow Belt — these are the data structures
// the subscription contract will use. The contract functions
// (create_plan, subscribe, execute_payment, cancel, pause, resume)
// will be implemented in lib.rs.
