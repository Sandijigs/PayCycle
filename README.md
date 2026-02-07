# PayCycle — Programmable Recurring Payments Protocol for Stellar

> The Stripe Billing of Web3 — enabling any Stellar dApp to add subscription payments in under 50 lines of code.

## 🔴 The Problem

The $556 billion subscription economy has **zero infrastructure** on Stellar. Every dApp that wants recurring payments must build billing from scratch — or go without recurring revenue.

## ✅ The Solution

PayCycle is a **pre-authorized debit protocol** on Soroban smart contracts. Users approve a spending cap once, and payments flow automatically — self-custodial, transparent, cancellable anytime.

```
User approves: "Up to 10 USDC per month to Merchant X"
    ↓
Contract auto-executes payment each cycle (if checks pass)
    ↓
User retains full custody until exact payment moment
    ↓
Cancel anytime with one click
```

## 🏗️ Tech Stack

| Layer               | Technology                                                  |
| ------------------- | ----------------------------------------------------------- |
| **Smart Contracts** | Rust + Soroban SDK                                          |
| **Frontend**        | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui |
| **Wallet**          | StellarWalletsKit (Freighter, xBull, Albedo)                |
| **SDK**             | TypeScript (`@paycycle/sdk`)                                |
| **Backend**         | Node.js (Express) + PostgreSQL                              |
| **CI/CD**           | GitHub Actions                                              |
| **Deployment**      | Vercel (frontend), Stellar Testnet → Mainnet                |

## 📦 Monorepo Structure

```
paycycle/
├── contracts/              # Soroban smart contracts (Rust)
│   ├── subscription/       # Core recurring payments protocol
│   ├── token/              # PLC reward token (Green Belt)
│   └── keeper/             # Payment execution + inter-contract calls (Green Belt)
├── frontend/               # Next.js merchant + subscriber interface
├── sdk/                    # TypeScript SDK for dApp integration
├── backend/                # API server for off-chain data
├── docs/                   # Architecture, user guide, security
└── .github/workflows/      # CI/CD pipeline
```

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/paycycle.git
cd paycycle

# Frontend
cd frontend && npm install && npm run dev

# Contracts (requires Rust + Soroban CLI)
cd contracts && cargo build --target wasm32-unknown-unknown --release
cargo test

# SDK
cd sdk && npm install && npm run build
```

## 📜 Deployed Contracts (Testnet)

| Contract     | Address | Description                              |
| ------------ | ------- | ---------------------------------------- |
| Subscription | `TODO`  | Core recurring payments protocol         |
| PLC Token    | `TODO`  | SEP-41 reward token                      |
| Keeper       | `TODO`  | Payment execution + inter-contract calls |

## 🔗 Links

- **Live Demo:** TODO
- **SDK:** `npm install @paycycle/sdk`
- **Demo Video:** TODO
- **Docs:** [docs/](./docs/)

## 👥 Testnet Users

| #   | Wallet Address | Role       | Date       | Source  |
| --- | -------------- | ---------- | ---------- | ------- |
| 1   | `G...`         | subscriber | YYYY-MM-DD | Discord |
| ... | ...            | ...        | ...        | ...     |

## 📄 License

MIT
