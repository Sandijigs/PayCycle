# PayCycle Architecture

## System Overview

```
┌──────────────────┐        JSON-RPC         ┌──────────────────┐
│   Next.js 14     │ ──────────────────────▶  │   Soroban RPC    │
│   (App Router)   │  simulateTransaction     │   (Testnet)      │
│                  │  sendTransaction          │                  │
│  React Query     │  getEvents               │                  │
│  StellarWalletsKit│ ◀────────────────────── │                  │
└──────────────────┘        responses         └────────┬─────────┘
        │                                              │
        │  Horizon REST                                │ invokes
        ▼                                              ▼
┌──────────────────┐                         ┌──────────────────────────────┐
│   Horizon API    │                         │      Stellar Testnet        │
│   (balances,     │                         │                              │
│    accounts)     │                         │  ┌────────────────────────┐  │
└──────────────────┘                         │  │  Subscription Contract │  │
                                             │  │  CBSG3PNV...TNT4KD    │  │
                                             │  └───────────┬────────────┘  │
                                             │              │               │
                                             │    transfer_from             │
                                             │              │               │
                                             │  ┌───────────▼────────────┐  │
                                             │  │  PLC Token (SEP-41)    │  │
                                             │  │  CB6X6N4Z...IYHOB     │  │
                                             │  └───────────▲────────────┘  │
                                             │              │               │
                                             │         mint (rewards)       │
                                             │              │               │
                                             │  ┌───────────┴────────────┐  │
                                             │  │  Keeper Contract       │  │
                                             │  │  CCYCHDQL...JX5DTA    │  │
                                             │  └────────────────────────┘  │
                                             └──────────────────────────────┘
```

## Smart Contract Architecture

### 1. Subscription Contract (`CBSG3PNV...TNT4KD`)

Core protocol logic for recurring payments.

| Method              | Type  | Description                                              |
|---------------------|-------|----------------------------------------------------------|
| `initialize`        | Write | Set admin, fee basis points, and fee collector address   |
| `create_plan`       | Write | Merchant creates a plan (token, amount, interval, name)  |
| `subscribe`         | Write | User subscribes with a max spending cap                  |
| `execute_payment`   | Write | Debit subscriber via `transfer_from`, split to merchant + fee collector |
| `cancel`            | Write | Subscriber cancels their subscription                    |
| `pause` / `resume`  | Write | Subscriber pauses or resumes payments                    |
| `get_plan`          | Read  | Fetch plan data by ID                                    |
| `get_subscription`  | Read  | Fetch subscription data by ID                            |
| `get_user_subscriptions` | Read | List all subscription IDs for a user                |
| `get_plan_count`    | Read  | Total number of plans created                            |

**Storage layout** (instance storage with composite keys):
```
"admin"             → Address
"fee_bps"           → u32 (50 = 0.5%)
"fee_col"           → Address
"plan_cnt"          → u64
"sub_cnt"           → u64
("plan", id)        → PlanData
("sub", id)         → SubscriptionData
("user_subs", addr) → Vec<u64>
```

### 2. PLC Token Contract (`CB6X6N4Z...IYHOB`)

SEP-41 compliant fungible token used for protocol rewards.

| Method         | Type  | Description                          |
|----------------|-------|--------------------------------------|
| `initialize`   | Write | Set admin, name, symbol, decimals    |
| `mint`         | Write | Admin mints tokens to an address     |
| `transfer`     | Write | Standard token transfer              |
| `approve`      | Write | Approve spender with expiry ledger   |
| `transfer_from`| Write | Delegated transfer (allowance-based) |
| `burn` / `burn_from` | Write | Destroy tokens                 |
| `balance`      | Read  | Query balance for an address         |
| `allowance`    | Read  | Query allowance between two addresses|
| `name` / `symbol` / `decimals` | Read | Token metadata        |

### 3. Keeper Contract (`CCYCHDQL...JX5DTA`)

Orchestrator that executes payments and distributes PLC rewards via **5 inter-contract calls**:

```
execute_and_reward(subscription_id)
    │
    ├── 1. subscription.get_subscription(id)     — read sub state
    ├── 2. subscription.get_plan(plan_id)        — read plan details
    ├── 3. subscription.execute_payment(id)      — debit subscriber → merchant + fee
    ├── 4. plc_token.mint(subscriber, reward)    — reward subscriber with PLC
    └── 5. plc_token.mint(merchant, reward)      — reward merchant with PLC
```

`batch_execute(ids: Vec<u64>)` loops over multiple subscriptions atomically.

## Data Flow

### Payment Execution (via Keeper)

```
1. Subscriber approves XLM SAC: token.approve(subscriber, subscription_contract, cap, expiry)
2. Keeper calls: execute_and_reward(subscription_id)
3. Subscription contract:
   a. Validates: status=Active, time >= next_payment, amount <= cap
   b. transfer_from(subscriber → merchant, net_amount)
   c. transfer_from(subscriber → fee_collector, fee)
   d. Updates next_payment = now + interval
4. Keeper mints PLC rewards to subscriber and merchant
```

### Frontend → Contract Interaction

```
useSubscription hook
    │
    ├── queryContract(method, ...args)      — read-only simulation (no wallet)
    │       └── simulateTransaction → scValToNative(result)
    │
    └── invokeContract(method, ...args)     — full write path
            ├── Build TransactionBuilder
            ├── simulateTransaction
            ├── assembleTransaction (auth + footprint)
            ├── kit.signTransaction (wallet popup)
            ├── sendTransaction
            └── poll getTransaction until SUCCESS
```

### Event-Driven Cache Invalidation

```
useContractEvents (polls getEvents every 15s)
    │
    ├── Decodes XDR topics → classifies event type
    └── On new events → invalidates React Query caches:
            ├── allPlans
            ├── merchantPlans
            ├── userSubscriptions
            └── balance
```

## Security Considerations

- **Self-custodial**: Private keys never leave the wallet extension. All signing is client-side via StellarWalletsKit.
- **Spending caps**: Subscribers set a `max_amount` per payment — the contract rejects amounts exceeding the cap (Error #7).
- **Approve/transfer_from pattern**: Avoids requiring `from.require_auth()` in sub-invocations. The subscriber approves once, and the contract uses `transfer_from` for each payment cycle.
- **Time-gated execution**: `execute_payment` checks `env.ledger().timestamp() >= next_payment` — no early debits.
- **Status guards**: Only `Active` subscriptions can be debited; only `Active` plans accept new subscribers.
- **Protocol fees**: Configurable basis points (default 50 = 0.5%), enforced on-chain with separate `transfer_from` to fee collector.
- **No escrow**: Funds remain in the subscriber's account until the exact moment of payment execution.
