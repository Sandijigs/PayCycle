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

![PayCycle Dashboard](docs/screenshots/paycycle-dashboard.png)

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

## Features (Current Release)

This release implements the foundational wallet integration and transaction layer:

| Feature              | Status | Description                                               |
| -------------------- | ------ | --------------------------------------------------------- |
| Wallet Connection    | Done   | Connect/disconnect Freighter wallet on Stellar Testnet    |
| Balance Display      | Done   | Real-time XLM balance with auto-refresh (30s interval)    |
| Testnet Funding      | Done   | One-click Friendbot funding for unfunded accounts         |
| Send XLM             | Done   | Transfer XLM to any Stellar address with full validation  |
| Transaction Feedback | Done   | Real-time signing/submitting/success/error states         |
| Transaction Explorer | Done   | Direct link to Stellar Expert for submitted transactions  |
| Account Creation     | Done   | Auto-detect unfunded destinations and use `createAccount` |

### Transaction Flow

```
[User enters destination + amount]
        |
[Validation: address format, balance, minimum reserve]
        |
[Check if destination exists on network]
        |-- exists --> Operation.payment()
        |-- new -----> Operation.createAccount()
        |
[Sign via Freighter wallet]
        |
[Submit to Stellar Testnet]
        |
[Display result + Stellar Expert link]
```

---

## Tech Stack

| Layer                  | Technology                                                  |
| ---------------------- | ----------------------------------------------------------- |
| **Frontend**           | Next.js 14 (App Router), TypeScript, TailwindCSS            |
| **UI Components**      | shadcn/ui (Badge, Button, Card, Input)                      |
| **Wallet Integration** | StellarWalletsKit v1.x (Freighter)                          |
| **Stellar SDK**        | @stellar/stellar-sdk v12                                    |
| **State Management**   | React Query v5 (server state), React Context (wallet state) |
| **Smart Contracts**    | Rust + Soroban SDK (upcoming belts)                         |
| **Deployment**         | Vercel (frontend), Stellar Testnet                          |

---

## Project Structure

```
paycycle/
├── frontend/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout with header, footer, providers
│   │   │   ├── page.tsx               # Landing page with wallet + transaction cards
│   │   │   └── globals.css            # Brand design system (gradients, glass, glows)
│   │   ├── components/
│   │   │   ├── wallet/
│   │   │   │   ├── WalletProvider.tsx  # StellarWalletsKit context provider
│   │   │   │   ├── ConnectButton.tsx   # Wallet connect/disconnect button
│   │   │   │   └── BalanceDisplay.tsx  # Balance card with Friendbot + address info
│   │   │   ├── transaction/
│   │   │   │   ├── SendXLM.tsx         # XLM transfer form with full validation
│   │   │   │   └── TxStatus.tsx        # Transaction status feedback component
│   │   │   ├── ui/                     # shadcn/ui primitives (badge, button, card, input)
│   │   │   └── Providers.tsx           # Client-side providers wrapper
│   │   ├── hooks/
│   │   │   ├── useWallet.ts            # Wallet context consumer hook
│   │   │   └── useBalance.ts           # Balance fetching with React Query
│   │   └── lib/
│   │       └── utils.ts                # Utility functions (cn class merger)
│   ├── tailwind.config.ts              # Tailwind + CSS variable mappings
│   └── package.json
├── contracts/                          # Soroban smart contracts (future belts)
│   ├── subscription/                   # Core recurring payments protocol
│   ├── token/                          # PLC reward token
│   └── keeper/                         # Payment execution engine
├── sdk/                                # TypeScript SDK (future)
├── backend/                            # API server (future)
├── docs/                               # Documentation
└── LICENSE                             # MIT
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
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
cp .env.local.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_FRIENDBOT_URL=https://friendbot.stellar.org
```

### Freighter Setup

1. Install the [Freighter browser extension](https://www.freighter.app/)
2. Create or import a Stellar wallet
3. **Switch to Test Net** — Open Freighter > Settings > Network > Select "Test Net"
4. Connect your wallet through the PayCycle interface
5. Fund your testnet account using the built-in Friendbot button

---

## Architecture

### Wallet Integration

PayCycle uses **StellarWalletsKit** as the wallet abstraction layer, currently configured with the Freighter module. The wallet state is managed through React Context (`WalletProvider`), making it accessible throughout the component tree.

```
WalletProvider (React Context)
    |
    ├── StellarWalletsKit instance
    ├── Connection state (address, isConnected, isConnecting)
    ├── connect() → opens wallet modal → getAddress()
    └── disconnect() → clears state
```

**Key design decisions:**

- **Providers pattern** — `Providers.tsx` wraps both `QueryClientProvider` and `WalletProvider` as a client component, while `layout.tsx` remains a server component for SEO and performance.
- **Auto-reconnect** — On page load, the provider checks if the wallet was previously connected and silently restores the session.
- **Kit exposure** — The `kit` instance is exposed through context so components like `SendXLM` can directly call `kit.signTransaction()`.

### Balance Fetching

Balance data is fetched from the Stellar Horizon API and cached with React Query:

- **Stale time:** 10 seconds (prevents redundant requests)
- **Auto-refetch:** Every 30 seconds (keeps balance current)
- **Manual refetch:** Available via the refresh button on the balance card
- **404 handling:** Unfunded accounts return "0" balance instead of throwing errors

### Transaction Handling

The `SendXLM` component handles the full transaction lifecycle:

1. **Input validation** — Stellar address format (Ed25519 public key), amount > 0, sufficient balance (reserves 1 XLM for fees + minimum balance)
2. **Destination check** — Loads the destination account from Horizon to determine if it exists
3. **Operation selection** — Uses `Operation.payment()` for existing accounts, `Operation.createAccount()` for unfunded destinations
4. **Signing** — Delegates to Freighter via `kit.signTransaction(xdr, { networkPassphrase })`
5. **Submission** — Submits the signed XDR to the Horizon server
6. **Feedback** — Displays real-time status (signing → submitting → success/error) with a link to Stellar Expert

### Design System

The UI uses a custom brand design system built on CSS custom properties and Tailwind:

- **Primary:** Purple (#7C3AED) — used for CTAs, gradients, and brand elements
- **Accent:** Teal (#0D9488) — used for status indicators and secondary highlights
- **Gradient brand:** 3-stop gradient (purple → blue → teal) for headers and buttons
- **Glass morphism:** Semi-transparent backgrounds with backdrop blur for the sticky header
- **Dark mode ready:** Full set of dark theme CSS variables defined

---

## Security Considerations

- **Self-custodial** — No private keys are ever stored or transmitted. All signing happens in the Freighter wallet extension.
- **Input validation** — Destination addresses are validated using `StellarSdk.StrKey.isValidEd25519PublicKey()` before any transaction is built.
- **Balance guards** — The app reserves 1 XLM for network fees and minimum balance requirements, preventing users from draining their accounts.
- **Network isolation** — The app is configured for Stellar Testnet with explicit network passphrase verification, preventing accidental mainnet transactions.
- **No hardcoded secrets** — All network configuration is loaded from environment variables.

---

## Roadmap

PayCycle follows the Stellar Journey to Mastery belt progression:

| Belt            | Focus                                                        | Status  |
| --------------- | ------------------------------------------------------------ | ------- |
| **White Belt**  | Wallet integration, XLM transfers, testnet setup             | Current |
| **Yellow Belt** | Soroban smart contract deployment, subscription contract v1  | Planned |
| **Orange Belt** | Subscription dashboard, plan management, payment execution   | Planned |
| **Green Belt**  | PLC token (SEP-41), keeper contract, inter-contract calls    | Planned |
| **Blue Belt**   | TypeScript SDK, merchant integration API, CI/CD pipeline     | Planned |
| **Black Belt**  | Mainnet launch, security audit, user acquisition (25+ users) | Planned |

### Upcoming Features

- Subscription plan creation and management
- Automated recurring payment execution via Soroban
- PLC governance/reward token
- Merchant dashboard with analytics
- TypeScript SDK for third-party dApp integration
- Multi-wallet support (xBull, Albedo)

---

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

```bash
# Run the development server
cd frontend && npm run dev

# Run tests
npm run test

# Lint the codebase
npm run lint
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

Built on [Stellar](https://stellar.org) | Powered by [Soroban](https://soroban.stellar.org)
