#![no_std]

// PLC Token — SEP-41 Compliant Fungible Token
//
// PayCycle's governance/reward token. Minted to merchants and subscribers
// on completed subscription payments. Admin-controlled minting allows
// the keeper contract to distribute rewards atomically.

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};
use soroban_token_sdk::metadata::TokenMetadata;
use soroban_token_sdk::TokenUtils;

// ──────────────────────────────────────────────
// STORAGE TYPES
// ──────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
    Allowance(AllowanceKey),
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceData {
    pub amount: i128,
    pub expiration_ledger: u32,
}

// ──────────────────────────────────────────────
// TTL CONSTANTS (ledger = ~5 seconds)
// ──────────────────────────────────────────────

const INSTANCE_BUMP: u32 = 7 * 24 * 60 * 60 / 5; // ~7 days
const INSTANCE_THRESHOLD: u32 = INSTANCE_BUMP - 24 * 60 * 60 / 5; // ~6 days
const BALANCE_BUMP: u32 = 30 * 24 * 60 * 60 / 5; // ~30 days
const BALANCE_THRESHOLD: u32 = BALANCE_BUMP - 7 * 24 * 60 * 60 / 5; // ~23 days

// ──────────────────────────────────────────────
// CONTRACT
// ──────────────────────────────────────────────

#[contract]
pub struct PayCycleToken;

// ── Internal Helpers ──

impl PayCycleToken {
    fn require_admin(env: &Env) -> Address {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
        admin
    }

    fn read_balance(env: &Env, addr: &Address) -> i128 {
        let key = DataKey::Balance(addr.clone());
        if let Some(balance) = env.storage().persistent().get::<_, i128>(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, BALANCE_THRESHOLD, BALANCE_BUMP);
            balance
        } else {
            0
        }
    }

    fn write_balance(env: &Env, addr: &Address, amount: i128) {
        let key = DataKey::Balance(addr.clone());
        env.storage().persistent().set(&key, &amount);
        env.storage()
            .persistent()
            .extend_ttl(&key, BALANCE_THRESHOLD, BALANCE_BUMP);
    }

    fn read_allowance(env: &Env, from: &Address, spender: &Address) -> AllowanceData {
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        if let Some(data) = env.storage().temporary().get::<_, AllowanceData>(&key) {
            if data.expiration_ledger < env.ledger().sequence() {
                AllowanceData {
                    amount: 0,
                    expiration_ledger: 0,
                }
            } else {
                data
            }
        } else {
            AllowanceData {
                amount: 0,
                expiration_ledger: 0,
            }
        }
    }

    fn write_allowance(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
        expiration_ledger: u32,
    ) {
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        let data = AllowanceData {
            amount,
            expiration_ledger,
        };
        env.storage().temporary().set(&key, &data);
        if amount > 0 && expiration_ledger >= env.ledger().sequence() {
            let live_for = expiration_ledger
                .checked_sub(env.ledger().sequence())
                .unwrap_or(0);
            env.storage()
                .temporary()
                .extend_ttl(&key, live_for, live_for);
        }
    }

    fn spend_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
        let allowance = Self::read_allowance(env, from, spender);
        assert!(allowance.amount >= amount, "insufficient allowance");
        if amount > 0 {
            Self::write_allowance(
                env,
                from,
                spender,
                allowance.amount - amount,
                allowance.expiration_ledger,
            );
        }
    }
}

// ── Public Interface ──

#[contractimpl]
impl PayCycleToken {
    // ──────────────────────────────────────────────
    // INITIALIZATION
    // ──────────────────────────────────────────────

    /// Initialize the PLC token. Can only be called once.
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "already initialized"
        );
        env.storage().instance().set(&DataKey::Admin, &admin);
        TokenUtils::new(&env)
            .metadata()
            .set_metadata(&TokenMetadata {
                decimal,
                name,
                symbol,
            });
    }

    // ──────────────────────────────────────────────
    // SEP-41: QUERY FUNCTIONS
    // ──────────────────────────────────────────────

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
        Self::read_balance(&env, &id)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
        Self::read_allowance(&env, &from, &spender).amount
    }

    pub fn decimals(env: Env) -> u32 {
        TokenUtils::new(&env).metadata().get_metadata().decimal
    }

    pub fn name(env: Env) -> String {
        TokenUtils::new(&env).metadata().get_metadata().name
    }

    pub fn symbol(env: Env) -> String {
        TokenUtils::new(&env).metadata().get_metadata().symbol
    }

    // ──────────────────────────────────────────────
    // SEP-41: APPROVE
    // ──────────────────────────────────────────────

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        Self::write_allowance(&env, &from, &spender, amount, expiration_ledger);
        TokenUtils::new(&env)
            .events()
            .approve(from, spender, amount, expiration_ledger);
    }

    // ──────────────────────────────────────────────
    // SEP-41: TRANSFER
    // ──────────────────────────────────────────────

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        let from_bal = Self::read_balance(&env, &from);
        assert!(from_bal >= amount, "insufficient balance");

        Self::write_balance(&env, &from, from_bal - amount);
        Self::write_balance(&env, &to, Self::read_balance(&env, &to) + amount);

        TokenUtils::new(&env).events().transfer(from, to, amount);
    }

    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        spender.require_auth();
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        Self::spend_allowance(&env, &from, &spender, amount);

        let from_bal = Self::read_balance(&env, &from);
        assert!(from_bal >= amount, "insufficient balance");

        Self::write_balance(&env, &from, from_bal - amount);
        Self::write_balance(&env, &to, Self::read_balance(&env, &to) + amount);

        TokenUtils::new(&env).events().transfer(from, to, amount);
    }

    // ──────────────────────────────────────────────
    // SEP-41: BURN
    // ──────────────────────────────────────────────

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        let from_bal = Self::read_balance(&env, &from);
        assert!(from_bal >= amount, "insufficient balance");

        Self::write_balance(&env, &from, from_bal - amount);
        TokenUtils::new(&env).events().burn(from, amount);
    }

    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        Self::spend_allowance(&env, &from, &spender, amount);

        let from_bal = Self::read_balance(&env, &from);
        assert!(from_bal >= amount, "insufficient balance");

        Self::write_balance(&env, &from, from_bal - amount);
        TokenUtils::new(&env).events().burn(from, amount);
    }

    // ──────────────────────────────────────────────
    // ADMIN: MINT & MANAGEMENT
    // ──────────────────────────────────────────────

    /// Mint new PLC tokens. Only callable by admin.
    /// The subscription/keeper contract will be set as admin to mint rewards.
    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = Self::require_admin(&env);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        assert!(amount > 0, "mint amount must be positive");

        Self::write_balance(&env, &to, Self::read_balance(&env, &to) + amount);
        TokenUtils::new(&env).events().mint(admin, to, amount);
    }

    /// Transfer admin role. Only callable by current admin.
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = Self::require_admin(&env);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        TokenUtils::new(&env)
            .events()
            .set_admin(admin, new_admin);
    }
}
