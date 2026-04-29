# PayCycle User Guide

Complete step-by-step guide for merchants and subscribers on Stellar Testnet.

---

## Prerequisites

- A Chromium-based browser (Chrome, Brave, Edge) or Firefox
- Internet connection

---

## For Merchants — Create a Subscription Plan

### Step 1: Install the Freighter Wallet

1. Visit [freighter.app](https://www.freighter.app/) and click **Add to Chrome** (or your browser).
2. Once installed, click the Freighter icon in your browser toolbar.
3. Create a new wallet — write down your recovery phrase and store it securely.
4. Set a password to protect your wallet.

### Step 2: Switch to Testnet

1. Open Freighter by clicking its icon in the browser toolbar.
2. Click the **network name** at the top of the popup (it defaults to "Mainnet").
3. Select **"Test Net"** from the dropdown.
4. You should see "Test Net" displayed at the top.

> **Why Testnet?** PayCycle is currently deployed on Stellar Testnet. All tokens are free test tokens with no real value — perfect for trying things out.

### Step 3: Fund Your Wallet via Friendbot

1. Go to [PayCycle](https://paycycle.vercel.app) and click **Connect Wallet**.
2. Approve the connection in Freighter.
3. If your balance shows 0 XLM, click **Fund with Friendbot** on the homepage.
4. Wait a few seconds — you'll receive 10,000 free testnet XLM.

Alternatively, use the guided setup at [/onboarding](https://paycycle.vercel.app/onboarding) which walks you through all these steps in one place.

### Step 4: Create Your First Plan

1. Navigate to **My Plans** in the top navigation.
2. Click **Create New Plan**.
3. **Step 1/3 — Details:** Enter a plan name (e.g., "Pro Monthly") and optional description.
4. **Step 2/3 — Pricing:** Choose the payment token (XLM), set the amount (e.g., 10), and pick a billing interval (Daily / Weekly / Monthly).
5. **Step 3/3 — Review:** Verify the details and click **Create Plan**.
6. Approve the transaction in Freighter when prompted.
7. Wait for confirmation — you'll see a success message with a transaction hash.

### Step 5: Share Your Plan

Once created, your plan appears in the **My Plans** page. To share it with subscribers:

1. Hover over your plan card and click the **Share** button.
2. This copies a link in the format: `paycycle.vercel.app/plan/[id]`
3. Send this link to anyone you want to subscribe — they'll see the plan details and a one-click subscribe button.

---

## For Subscribers — Subscribe to a Plan

### Option A: Via a Shared Link (Recommended)

1. Open the plan link the merchant shared with you (e.g., `paycycle.vercel.app/plan/1`).
2. You'll see the plan name, price, interval, and subscriber count.
3. Click **Connect Wallet to Subscribe** (or **Subscribe Now** if already connected).
4. If you're new, follow the setup link at the bottom to install Freighter and get funded.
5. **Step 1/3 — Spending Cap:** Set the maximum amount the contract can debit per payment. The default is 12x the plan amount (1 year buffer). Adjust if you prefer.
6. **Step 2/3 — Approve Tokens:** Click **Approve Spending** and confirm in Freighter. This authorizes the contract to debit up to your spending cap.
7. **Step 3/3 — Confirm:** Click **Confirm Subscription** and approve in Freighter.
8. Done! Your subscription is now active.

### Option B: Browse Plans in the App

1. Go to [PayCycle](https://paycycle.vercel.app) and connect your wallet.
2. Navigate to **Subscribe** in the top navigation.
3. Click the **Browse Plans** tab to see all available plans.
4. Click on a plan to start the subscription flow.

### Managing Your Subscriptions

From the **Subscribe** page, the **My Subscriptions** tab shows all your active subscriptions:

- **Pause** — Temporarily stop payments. You can resume anytime.
- **Resume** — Restart a paused subscription. The next payment is recalculated from the current time.
- **Cancel** — Permanently stop the subscription. This is instant and irreversible.

---

## Key Concepts

### Spending Caps

When you subscribe, you set a **maximum amount** the contract can charge per payment cycle. Even if the merchant changes the plan price, the contract enforces your cap. This is your trust guarantee.

### Self-Custody

Your funds stay in your wallet at all times. The contract only transfers tokens at the exact moment a payment executes — and only if all conditions are met (subscription is active, payment is due, amount is within cap).

### Payment Execution

Payments execute automatically when they're due. Anyone can trigger the `execute_payment` function — the contract validates all conditions internally. No one can charge you early or exceed your cap.

### Protocol Fee

A 0.5% fee is deducted from each payment and sent to the protocol fee collector. This fee is visible on-chain and deducted from the payment amount (the merchant receives amount minus fee).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Wallet not found" | Install Freighter from [freighter.app](https://www.freighter.app/) |
| "Transaction rejected" | You clicked "Reject" in Freighter — try again and click "Approve" |
| Balance shows 0 XLM | Click "Fund with Friendbot" on the homepage or go to /onboarding |
| "Plan not found" | The plan ID in the URL may be incorrect — ask the merchant for the correct link |
| "Not authorized" | Make sure you're using the wallet that owns the subscription |
| "Payment not due yet" | The next payment time hasn't been reached — payments follow the plan interval |

---

## Quick Links

- **App:** [paycycle.vercel.app](https://paycycle.vercel.app)
- **Get Started Guide:** [/onboarding](https://paycycle.vercel.app/onboarding)
- **GitHub:** [github.com/Sandijigs/PayCycle](https://github.com/Sandijigs/PayCycle)
- **Contract on Stellar Expert:** [View on Explorer](https://stellar.expert/explorer/testnet/contract/CBSG3PNVBSY32MOEEVYFVQPSOFSQGA5WEP3HTVX7YOXTSASWJ4TNT4KD)
