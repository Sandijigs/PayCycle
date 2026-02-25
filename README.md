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

<img width="1635" height="968" alt="PayCycle Dashboard" src="https://github.com/user-attachments/assets/45425578-f6cb-46bc-9626-26c70dc85de7" />

---

## Live Demo & Media

| Resource | Link |
|----------|------|
| **Live Demo** | [frontend-seven-alpha-99.vercel.app](https://frontend-seven-alpha-99.vercel.app) |
| **Demo Video (1 min)** | [YouTube — PayCycle Demo](https://youtu.be/uOhB9rMPtSM) |
| **Contract on Testnet** | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBSG3PNVBSY32MOEEVYFVQPSOFSQGA5WEP3HTVX7YOXTSASWJ4TNT4KD) |

### Test Output (3+ tests passing)

**Contract Tests (12 passing):**

<!-- ADD YOUR CONTRACT TEST SCREENSHOT HERE -->
<!-- Example: ![Contract Tests](./docs/contract-tests.png) -->

**Frontend Tests (26 passing):**

<!-- ADD YOUR FRONTEND TEST SCREENSHOT HERE -->
<!-- Example: ![Frontend Tests](./docs/frontend-tests.png) -->

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

## Features

### Smart Contract (Soroban/Rust)

| Feature | Description |
|---------|-------------|
| Plan Management | Merchants create subscription plans with token, amount, and interval |
| Subscribe | Users subscribe with a spending cap (pre-authorized debit) |
| Execute Payment | Automated recurring payments with `transfer_from` pattern |
| Pause/Resume | Subscribers can pause and resume subscriptions |
| Cancel | One-click cancellation with immediate effect |
| Fee Collection | 0.5% protocol fee on each payment |
| Initialization | Admin-controlled setup with configurable fee collector |

### Frontend (Next.js)

| Feature | Description |
|---------|-------------|
| Wallet Connection | Multi-wallet support via StellarWalletsKit (Freighter, xBull, Lobstr) |
| Dashboard | Role-based tabs (Merchant / Subscriber) with stat cards |
| Plan Creation | 3-step wizard for creating subscription plans |
| Subscribe Flow | Browse plans, subscribe with spending cap approval |
| Subscription Management | Pause, resume, cancel subscriptions with confirmation |
| Skeleton Loading | Animated skeleton states while data loads |
| React Query Caching | Plans cached 30s, subscriptions 15s, auto-invalidated on mutations |
| Toast Notifications | Success/error feedback on all actions via sonner |
| Error Boundary | Graceful crash recovery with "Try Again" |
| Mobile Responsive | Hamburger navigation for small screens |
| Vercel Deployment | Production-ready with environment variable configuration |

### Transaction Flow

```
[Merchant creates plan] → name, token, amount, interval
        |
[Subscriber subscribes] → approves spending cap
        |
[Payment execution] → transfer_from subscriber → merchant (net) + fee_collector (0.5%)
        |
[Subscriber manages] → pause / resume / cancel anytime
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Rust, Soroban SDK v21.7.7 |
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS |
| **Wallet Integration** | StellarWalletsKit v1.9.5 (Freighter, xBull, Lobstr) |
| **Stellar SDK** | @stellar/stellar-sdk v14.5.0 |
| **State Management** | React Query v5 (server state), React Context (wallet state) |
| **Notifications** | Sonner (toast notifications) |
| **Testing** | Vitest + @testing-library/react (frontend), `cargo test` (contract) |
| **Deployment** | Vercel (frontend), Stellar Testnet (contract) |

---

## Project Structure

```
paycycle/
├── contracts/
│   └── subscription/
│       └── src/
│           ├── lib.rs           # Contract implementation (create_plan, subscribe, execute_payment, etc.)
│           ├── types.rs         # PlanData, SubscriptionData, PlanStatus, SubscriptionStatus
│           ├── errors.rs        # PayCycleError enum (12 error variants)
│           ├── events.rs        # Contract event definitions
│           └── test.rs          # 12 contract tests
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root layout with nav, error boundary, toaster
│       │   ├── page.tsx         # Landing page
│       │   ├── dashboard/       # Dashboard with merchant/subscriber tabs
│       │   ├── plans/           # Plan creation and management
│       │   └── subscribe/       # Browse plans, manage subscriptions
│       ├── components/
│       │   ├── wallet/          # WalletProvider, ConnectButton
│       │   ├── subscription/    # CreatePlanForm, SubscribeFlow, SubscriptionCard
│       │   ├── transaction/     # TxStatus
│       │   ├── ui/              # Reusable UI primitives (button, card, skeleton, etc.)
│       │   ├── ErrorBoundary.tsx
│       │   └── MobileNav.tsx
│       ├── hooks/
│       │   ├── useSubscription.ts     # Core Soroban contract interaction hook
│       │   ├── useContractQueries.ts  # React Query wrapper hooks + mutations
│       │   ├── useWallet.ts           # Wallet context consumer
│       │   ├── useBalance.ts          # Balance fetching with React Query
│       │   └── useTokenApproval.ts    # Token approval for recurring debits
│       ├── lib/
│       │   ├── contracts.ts     # Contract addresses and token config
│       │   └── stellar.ts       # Network configuration
│       ├── types/
│       │   └── subscription.ts  # TypeScript types, intervals, error parsing
│       └── __tests__/
│           └── components.test.tsx  # 26 frontend component tests
├── .github/workflows/ci.yml    # CI pipeline (contract + frontend tests)
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 22.x
- **npm** >= 11.x
- **Rust** + `wasm32-unknown-unknown` target (for contract development)
- **Stellar CLI** (`stellar`) for contract deployment
- **Freighter Wallet** — [Install the browser extension](https://www.freighter.app/)

### Installation

```bash
# Clone the repository
git clone https://github.com/Sandijigs/PayCycle.git
cd PayCycle

# Install frontend dependencies
cd frontend
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your contract ID

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ID=<your-deployed-contract-id>
```

### Contract Development

```bash
# Build the contract
cd contracts/subscription
stellar contract build

# Run contract tests
cargo test

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/pay_cycle_subscription.wasm \
  --source <your-identity> \
  --network testnet

# Initialize the contract
stellar contract invoke \
  --id <contract-id> \
  --source <your-identity> \
  --network testnet \
  -- initialize \
  --admin <admin-address> \
  --fee_bps 50 \
  --fee_collector <fee-collector-address>
```

### Running Tests

```bash
# Frontend tests (26 tests)
cd frontend
npx vitest run

# Contract tests (12 tests)
cd contracts/subscription
cargo test
```

### Freighter Setup

1. Install the [Freighter browser extension](https://www.freighter.app/)
2. Create or import a Stellar wallet
3. **Switch to Test Net** — Open Freighter > Settings > Network > Select "Test Net"
4. Connect your wallet through the PayCycle interface
5. Fund your testnet account using Friendbot

---

## Architecture

### Smart Contract Design

The subscription contract uses **instance storage** with composite keys for efficient data organization:

```
Storage Keys:
  "admin"           → Address (protocol admin)
  "fee_bps"         → u32 (fee in basis points, e.g. 50 = 0.5%)
  "fee_col"         → Address (fee collector)
  "plan_cnt"        → u64 (total plan count)
  "sub_cnt"         → u64 (total subscription count)
  ("plan", id)      → PlanData
  ("sub", id)       → SubscriptionData
  ("user_subs", addr) → Vec<u64> (user's subscription IDs)
```

**Payment Flow:**
```
execute_payment(subscription_id)
    |
    ├── Verify subscription is Active
    ├── Verify payment is due (current_time >= next_payment)
    ├── Load plan and verify it's Active
    ├── Check amount <= spending cap
    ├── Calculate fee (amount * fee_bps / 10000)
    ├── transfer_from(subscriber → merchant, net_amount)
    ├── transfer_from(subscriber → fee_collector, fee_amount)
    └── Update next_payment = current_time + interval
```

### Frontend Architecture

```
Providers (QueryClient + Wallet)
    |
    ├── useSubscription()           # Low-level contract calls (invoke/query)
    ├── useContractQueries()        # React Query wrappers with caching
    │   ├── useMerchantPlans()      # staleTime: 30s
    │   ├── useAllActivePlans()     # staleTime: 30s
    │   ├── useUserSubscriptions()  # staleTime: 15s
    │   └── Mutations (auto-invalidate on success)
    └── Pages consume hooks directly
```

---

## Security Considerations

- **Self-custodial** — No private keys are stored or transmitted. All signing happens in the wallet extension.
- **Spending caps** — Subscribers set a maximum amount per payment, preventing overcharging.
- **Input validation** — All addresses validated before transaction construction.
- **Balance guards** — App reserves funds for network fees and minimum balance.
- **Network isolation** — Configured for Testnet with explicit passphrase verification.
- **Graceful error handling** — Contract query failures return empty data instead of crashing the UI.

---

## Roadmap

| Belt | Focus | Status |
|------|-------|--------|
| **White Belt** | Wallet integration, XLM transfers, testnet setup | Done |
| **Yellow Belt** | Soroban smart contract, subscription contract v1 | Done |
| **Orange Belt** | Dashboard, plan management, caching, deployment | Done |
| **Green Belt** | PLC token (SEP-41), keeper contract, inter-contract calls | Planned |
| **Blue Belt** | TypeScript SDK, merchant integration API, CI/CD | Planned |
| **Black Belt** | Mainnet launch, security audit, user acquisition | Planned |

---

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

```bash
# Development
cd frontend && npm run dev

# Tests
npx vitest run          # Frontend
cargo test              # Contract

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

Built on [Stellar](https://stellar.org) | Powered by [Soroban](https://soroban.stellar.org) | [GitHub](https://github.com/Sandijigs/PayCycle)
