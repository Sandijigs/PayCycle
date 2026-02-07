#![allow(unused)]
use soroban_sdk::{Env, Address, symbol_short};

pub fn emit_plan_created(env: &Env, plan_id: u64, merchant: &Address) {
    env.events().publish(
        (symbol_short!("plan"), symbol_short!("created")),
        (plan_id, merchant.clone()),
    );
}

pub fn emit_subscribed(env: &Env, subscription_id: u64, subscriber: &Address, plan_id: u64) {
    env.events().publish(
        (symbol_short!("sub"), symbol_short!("created")),
        (subscription_id, subscriber.clone(), plan_id),
    );
}

pub fn emit_payment_executed(env: &Env, subscription_id: u64, amount: i128) {
    env.events().publish(
        (symbol_short!("payment"), symbol_short!("exec")),
        (subscription_id, amount),
    );
}

pub fn emit_subscription_cancelled(env: &Env, subscription_id: u64) {
    env.events().publish(
        (symbol_short!("sub"), symbol_short!("cancel")),
        subscription_id,
    );
}

pub fn emit_subscription_paused(env: &Env, subscription_id: u64) {
    env.events().publish(
        (symbol_short!("sub"), symbol_short!("paused")),
        subscription_id,
    );
}

pub fn emit_subscription_resumed(env: &Env, subscription_id: u64) {
    env.events().publish(
        (symbol_short!("sub"), symbol_short!("resumed")),
        subscription_id,
    );
}

// TODO: These event functions are ready. Wire them into lib.rs at Yellow Belt.
