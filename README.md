# PayCycle

**Programmable Recurring Payments Protocol for Stellar**

PayCycle is a pre-authorized debit protocol built on Soroban smart contracts that brings subscription billing infrastructure to the Stellar ecosystem. Users approve a spending cap once, and payments flow automatically — fully self-custodial, transparent on-chain, and cancellable anytime.

```
User approves: "Up to 10 USDC per month to Merchant X"
    |
Contract auto-executes payment each cycle (if checks pass)
    |
User retains full custody until exact payment moment
    |
Cancel anytime with one click
```



<img width="1635" height="968" alt="Screenshot 2026-02-08 at 1 29 05 am" src="https://github.com/user-attachments/assets/45425578-f6cb-46bc-9626-26c70dc85de7" />

---

## Why PayCycle?

The $556 billion subscription economy has **zero native infrastructure** on Stellar. Every dApp that wants recurring payments must build billing from scratch — or go without recurring revenue entirely.

PayCycle solves this by providing a **protocol-level solution** that any Stellar dApp can integrate in under 50 lines of code, similar to what Stripe Billing does for traditional web applications.

**Key Differentiators:**

- **Self-Custodial** — Users retain full control of their funds. No escrow, no middlemen.
- **Sub-Cent Fees** — Built on Stellar's low-fee infrastructure (< $0.01 per transaction).
- **Cancel Anytime** — One-click cancellation with immediate effect, no lock-in periods.
- **On-Chain Transparency** — Every payment is verifiable on the Stellar ledger.

---

## Deployed Contracts

| Contract            | Network | Address                                                      |
| ------------------- | ------- | ------------------------------------------------------------ |
| Subscription v1     | Testnet | `CAAWHQ5VETZSR54RNBASRKSCBTRI773XVPXTW7D3VKYB2G5PLBZNXVQS` |
| XLM SAC (Native)    | Testnet | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

[View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAAWHQ5VETZSR54RNBASRKSCBTRI773XVPXTW7D3VKYB2G5PLBZNXVQS)

---

## Features

### White Belt — Wallet & Transactions

| Feature              | Status | Description                                               |
| -------------------- | ------ | --------------------------------------------------------- |
| Wallet Connection    | Done   | Connect/disconnect via Freighter, xBull, or Lobstr        |
| Balance Display      | Done   | Real-time XLM balance with auto-refresh (30s interval)    |
| Testnet Funding      | Done   | One-click Friendbot funding for unfunded accounts         |
| Send XLM             | Done   | Transfer XLM to any Stellar address with full validation  |
| Transaction Feedback | Done   | Real-time signing/submitting/success/error states         |
| Transaction Explorer | Done   | Direct link to Stellar Expert for submitted transactions  |
| Account Creation     | Done   | Auto-detect unfunded destinations and use `createAccount` |

### Yellow Belt — Smart Contract & Subscriptions

| Feature                  | Status | Description                                                  |
| ------------------------ | ------ | ------------------------------------------------------------ |
| Subscription Contract    | Done   | Soroban smart contract with plans, subscriptions, payments   |
| 9 Unit Tests             | Done   | Full test coverage: init, create, subscribe, pay, cancel, pause/resume |
| Testnet Deployment       | Done   | Contract deployed and initialized on Stellar Testnet         |
| Frontend Integration     | Done   | `useSubscription` hook with full Soroban RPC interaction     |
| Contract Error Handling  | Done   | 12 error types mapped to user-friendly messages              |
| Multi-Wallet Support     | Done   | Freighter, xBull, and Lobstr via StellarWalletsKit           |
| Token Allowance Pattern  | Done   | `approve` + `transfer_from` for keeper-executable payments   |

### Subscription Contract Functions

```
initialize(admin, fee_bps, fee_collector)    — Set up protocol (one-time)
create_plan(merchant, token, amount, interval, name) — Merchant creates a plan
subscribe(subscriber, plan_id, max_amount)   — User subscribes with spending cap
execute_payment(subscription_id)             — Anyone can trigger due payments
cancel(subscriber, subscription_id)          — Cancel subscription instantly
pause(subscriber, subscription_id)           — Pause recurring payments
resume(subscriber, subscription_id)          — Resume paused subscription
get_plan(plan_id) / get_subscription(sub_id) — Read-only queries
```

### Payment Flow

```
[Merchant creates plan: 10 XLM / 1 hour]
        |
[User subscribes: max 15 XLM spending cap]
        |
[User approves token allowance to contract]
        |
[Anyone calls execute_payment when due]
        |
[Contract: check status, timing, spending cap]
        |-- subscriber pays plan amount (capped at max_amount)
        |-- 0.5% protocol fee to fee_collector
        |-- remainder to merchant
        |
[Next payment scheduled: now + interval]
```

---

## Tech Stack

| Layer                  | Technology                                                  |
| ---------------------- | ----------------------------------------------------------- |
| **Frontend**           | Next.js 14 (App Router), TypeScript, TailwindCSS            |
| **UI Components**      | shadcn/ui (Badge, Button, Card, Input)                      |
| **Wallet Integration** | StellarWalletsKit v1.x (Freighter, xBull, Lobstr)           |
| **Stellar SDK**        | @stellar/stellar-sdk v12                                    |
| **State Management**   | React Query v5 (server state), React Context (wallet state) |
| **Smart Contracts**    | Rust, Soroban SDK 21.7, soroban-token-sdk 21.7              |
| **Deployment**         | Vercel (frontend), Stellar Testnet (contracts)              |

---

## Project Structure

```
paycycle/
├── frontend/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout with header, footer, providers
│   │   │   ├── page.tsx               # Landing + SendXLM + Subscription test UI
│   │   │   └── globals.css            # Brand design system (gradients, glass, glows)
│   │   ├── components/
│   │   │   ├── wallet/
│   │   │   │   ├── WalletProvider.tsx  # StellarWalletsKit context (multi-wallet)
│   │   │   │   ├── ConnectButton.tsx   # Wallet bar: balance, network, address
│   │   │   │   └── BalanceDisplay.tsx  # Balance card with Friendbot + address
│   │   │   ├── transaction/
│   │   │   │   ├── SendXLM.tsx         # XLM transfer form with full validation
│   │   │   │   ├── SubscriptionTest.tsx# Contract interaction test UI
│   │   │   │   └── TxStatus.tsx        # Transaction status feedback component
│   │   │   ├── ui/                     # shadcn/ui primitives
│   │   │   └── Providers.tsx           # Client-side providers wrapper
│   │   ├── hooks/
│   │   │   ├── useWallet.ts            # Wallet context consumer hook
│   │   │   ├── useBalance.ts           # Balance fetching with React Query
│   │   │   └── useSubscription.ts      # Soroban contract interaction hook
│   │   └── lib/
│   │       ├── stellar.ts              # Network config (RPC URL, Horizon, passphrase)
│   │       ├── contracts.ts            # Contract addresses from env
│   │       └── utils.ts                # Utility functions (cn class merger)
│   └── package.json
├── contracts/                          # Soroban smart contracts
│   ├── subscription/                   # Core recurring payments protocol
│   │   └── src/
│   │       ├── lib.rs                  # Contract implementation (11 functions)
│   │       ├── types.rs                # PlanData, SubscriptionData, status enums
│   │       ├── errors.rs               # 12 PayCycleError variants
│   │       ├── events.rs               # 6 event emission functions
│   │       └── test.rs                 # 9 unit tests
│   ├── token/                          # PLC reward token (Green Belt)
│   └── keeper/                         # Payment execution engine (Green Belt)
├── sdk/                                # TypeScript SDK (Blue Belt)
├── backend/                            # API server (Blue Belt)
├── docs/                               # Documentation
└── LICENSE                             # MIT
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Rust** + `wasm32-unknown-unknown` target (for contract development)
- **Stellar CLI** (`cargo install --locked stellar-cli`)
- **Freighter Wallet** — [Install the browser extension](https://www.freighter.app/) (or xBull / Lobstr)

### Installation

```bash
# Clone the repository
git clone https://github.com/Sandijigs/PayCycle.git
cd PayCycle

# Install frontend dependencies
cd frontend
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Smart Contract Development

```bash
# Run unit tests
cd contracts
cargo test

# Build WASM for deployment
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/pay_cycle_subscription.wasm \
  --source <YOUR_KEY> --network testnet

# Initialize contract
stellar contract invoke --id <CONTRACT_ID> --source <YOUR_KEY> --network testnet \
  -- initialize --admin <ADMIN_PUBKEY> --fee_bps 50 --fee_collector <COLLECTOR_PUBKEY>
```

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ID=CAAWHQ5VETZSR54RNBASRKSCBTRI773XVPXTW7D3VKYB2G5PLBZNXVQS
```

### Wallet Setup

1. Install [Freighter](https://www.freighter.app/), [xBull](https://xbull.app/), or [Lobstr](https://lobstr.co/)
2. Create or import a Stellar wallet
3. **Switch to Test Net** — Open your wallet settings and select "Test Net"
4. Connect your wallet through the PayCycle interface
5. Fund your testnet account using the built-in Friendbot button

---

## Architecture

### Subscription Contract (Soroban/Rust)

The contract uses typed storage keys (`DataKey` enum) for Soroban's instance and persistent storage:

- **Instance storage** — Admin, fee config, plan/sub counters (shared, low-TTL)
- **Persistent storage** — Individual plans and subscriptions (entity-scoped, high-TTL)

The payment model uses the **approve + transfer_from** pattern:
1. Subscriber calls `token.approve(contract, amount, expiry)` to grant the contract a spending allowance
2. Anyone (keeper, merchant, subscriber) can call `execute_payment(sub_id)` when a payment is due
3. The contract calls `token.transfer_from(contract, subscriber, merchant, amount)` — auth comes from the contract as spender, not the subscriber
4. This enables **keeper execution** — payments are permissionless and can be triggered by automated bots

### Error Handling

The contract defines 12 typed errors (`PayCycleError`) that are mapped to user-friendly messages in the frontend:

| Code | Error               | Message                                       |
| ---- | ------------------- | --------------------------------------------- |
| 1    | NotAuthorized       | Not authorized to perform this action         |
| 2    | PlanNotFound        | Plan not found                                |
| 3    | SubscriptionNotFound| Subscription not found                        |
| 4    | InvalidStatus       | Invalid subscription status for this operation|
| 5    | InsufficientBalance | Insufficient balance                          |
| 6    | PaymentNotDue       | Payment is not due yet                        |
| 7    | ExceedsSpendingCap  | Amount exceeds spending cap                   |
| 8    | PlanInactive        | Plan is inactive                              |
| 9    | AlreadySubscribed   | Already subscribed to this plan               |
| 10   | IntervalTooShort    | Interval too short (min 1 hour)               |
| 11   | AmountTooLow        | Amount must be greater than zero              |
| 12   | AlreadyInitialized  | Contract is already initialized               |

### Frontend Integration

The `useSubscription` hook handles all Soroban RPC interaction:

```
invokeContract(method, ...params)
    |
    ├── Build transaction with Contract.call()
    ├── simulateTransaction() → get resource estimates
    ├── assembleTransaction() → attach resources + auth
    ├── kit.signTransaction() → sign via wallet
    ├── sendTransaction() → broadcast to network
    └── poll getTransaction() → wait for SUCCESS/FAILED
```

### Multi-Wallet Support

PayCycle supports multiple Stellar wallets through StellarWalletsKit:

- **Freighter** — Most popular Stellar browser wallet
- **xBull** — Advanced Stellar wallet with Soroban support
- **Lobstr** — Mobile-friendly Stellar wallet

The wallet selection modal appears automatically when connecting, showing all available wallets.

### Design System

The UI uses a custom brand design system built on CSS custom properties and Tailwind:

- **Primary:** Purple (#7C3AED) — used for CTAs, gradients, and brand elements
- **Accent:** Teal (#0D9488) — used for status indicators and secondary highlights
- **Gradient brand:** 3-stop gradient (purple → blue → teal) for headers and buttons
- **Glass morphism:** Semi-transparent backgrounds with backdrop blur for the sticky header

---

## Security Considerations

- **Self-custodial** — No private keys are ever stored or transmitted. All signing happens in the wallet extension.
- **Spending caps** — Subscribers set a `max_amount` that the contract can never exceed, even if the plan price increases.
- **Token allowance model** — The contract uses `transfer_from` with explicit allowances, not direct transfers.
- **Input validation** — Destination addresses are validated using `StellarSdk.StrKey.isValidEd25519PublicKey()`.
- **Balance guards** — The app reserves 1 XLM for network fees and minimum balance requirements.
- **Network isolation** — Configured for Stellar Testnet with explicit network passphrase verification.
- **No hardcoded secrets** — All network configuration is loaded from environment variables.

---

## Roadmap

PayCycle follows the Stellar Journey to Mastery belt progression:

| Belt            | Focus                                                        | Status  |
| --------------- | ------------------------------------------------------------ | ------- |
| **White Belt**  | Wallet integration, XLM transfers, testnet setup             | Done    |
| **Yellow Belt** | Soroban subscription contract, unit tests, frontend integration | Current |
| **Orange Belt** | Subscription dashboard, plan management, payment execution   | Planned |
| **Green Belt**  | PLC token (SEP-41), keeper contract, inter-contract calls    | Planned |
| **Blue Belt**   | TypeScript SDK, merchant integration API, CI/CD pipeline     | Planned |
| **Black Belt**  | Mainnet launch, security audit, user acquisition (25+ users) | Planned |

### Upcoming Features

- Subscription dashboard with plan management UI
- Automated payment execution via keeper bot
- PLC governance/reward token
- Merchant analytics dashboard
- TypeScript SDK for third-party dApp integration

---

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

```bash
# Run the frontend dev server
cd frontend && npm run dev

# Run contract tests
cd contracts && cargo test

# TypeScript type check
cd frontend && npx tsc --noEmit
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

Built on [Stellar](https://stellar.org) | Powered by [Soroban](https://soroban.stellar.org)
