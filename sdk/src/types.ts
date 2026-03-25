// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

export interface PayCycleConfig {
  /** Stellar network */
  network: "testnet" | "mainnet";
  /** Subscription contract address (C...) */
  contractId: string;
  /** PLC token contract address (optional, for reward queries) */
  plcTokenId?: string;
  /** Keeper contract address (optional, for execute_and_reward) */
  keeperId?: string;
  /** Custom Soroban RPC URL (defaults to testnet/mainnet public RPC) */
  rpcUrl?: string;
}

// ──────────────────────────────────────────────
// Contract Params
// ──────────────────────────────────────────────

export interface CreatePlanParams {
  /** Merchant wallet address */
  merchant: string;
  /** Payment token address (e.g. XLM SAC, USDC) */
  token: string;
  /** Amount per payment in stroops (7 decimals). Use formatAmount() helper. */
  amount: bigint;
  /** Payment interval in seconds. Use parseInterval() helper. */
  interval: number;
  /** Human-readable plan name */
  name: string;
}

export interface SubscribeParams {
  /** Subscriber wallet address */
  subscriber: string;
  /** Plan ID to subscribe to */
  planId: number;
  /** Max amount per payment in stroops (spending cap) */
  maxAmount: bigint;
}

// ──────────────────────────────────────────────
// Contract Data (returned from queries)
// ──────────────────────────────────────────────

export type PlanStatus = "Active" | "Paused" | "Cancelled";
export type SubscriptionStatus = "Active" | "Paused" | "Cancelled" | "Expired";

export interface PlanData {
  id: number;
  merchant: string;
  token: string;
  amount: bigint;
  interval: number;
  name: string;
  status: PlanStatus;
  subscriberCount: number;
  createdAt: number;
}

export interface SubscriptionData {
  id: number;
  subscriber: string;
  planId: number;
  maxAmount: bigint;
  status: SubscriptionStatus;
  lastPayment: number;
  nextPayment: number;
  paymentsMade: number;
  createdAt: number;
}

// ──────────────────────────────────────────────
// Transaction Result
// ──────────────────────────────────────────────

export interface PreparedTransaction {
  /** The unsigned transaction XDR (base64). Sign this with your wallet. */
  toXDR: () => string;
  /** Simulate, sign, submit, and poll in one call. Requires a signTransaction callback. */
  signAndSend: (signTransaction: SignTransactionFn) => Promise<TransactionResult>;
}

export interface TransactionResult {
  /** Whether the transaction succeeded */
  success: boolean;
  /** Transaction hash on the network */
  hash: string;
  /** Decoded return value from the contract (if any) */
  returnValue?: unknown;
}

/** Callback to sign a transaction XDR string. Returns the signed XDR. */
export type SignTransactionFn = (
  xdr: string,
  opts: { networkPassphrase: string }
) => Promise<string>;

// ──────────────────────────────────────────────
// Well-known Contract Addresses (Testnet)
// ──────────────────────────────────────────────

export const TESTNET_CONTRACTS = {
  subscription: "CBSG3PNVBSY32MOEEVYFVQPSOFSQGA5WEP3HTVX7YOXTSASWJ4TNT4KD",
  plcToken: "CB6X6N4ZMBQPBPJIIQYK745BEN67WFRJVUXCJRQ64S23ZB5HT32IYHOB",
  keeper: "CCYCHDQLVTYJZLMJ5F5MEGKESZMQABWDBDDWMNHJ5CKLHKEMESJX5DTA",
  xlmSac: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
} as const;
