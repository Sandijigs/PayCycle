// PayCycle TypeScript types
// Mirror the Soroban contract types

export type PlanStatus = "Active" | "Paused" | "Cancelled";
export type SubscriptionStatus = "Active" | "Paused" | "Cancelled" | "Expired";

export interface PlanData {
  id: number;
  merchant: string;
  token: string;
  amount: bigint;
  interval: number;       // seconds
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

export interface PaymentEvent {
  subscriptionId: number;
  amount: bigint;
  timestamp: number;
  txHash: string;
}

export type TxStatus = "idle" | "signing" | "submitting" | "success" | "error";

/** Parameters for creating a new subscription plan */
export interface CreatePlanParams {
  name: string;
  description?: string;  // stored client-side only for now
  token: string;          // token contract address
  amount: bigint;         // amount in stroops (7 decimals)
  interval: number;       // seconds between payments
}

/** Preset intervals in seconds */
export const INTERVALS = {
  daily:   86_400,
  weekly:  604_800,
  monthly: 2_592_000,  // 30 days
} as const;

export type IntervalKey = keyof typeof INTERVALS;

/** Human-readable labels for intervals */
export const INTERVAL_LABELS: Record<IntervalKey, string> = {
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
};

/** Map contract error codes to user-friendly messages */
export const CONTRACT_ERRORS: Record<number, string> = {
  1:  "Not authorized to perform this action",
  2:  "Plan not found",
  3:  "Subscription not found",
  4:  "Invalid subscription status for this operation",
  5:  "Insufficient token balance",
  6:  "Payment is not due yet",
  7:  "Amount exceeds your spending cap",
  8:  "This plan is no longer active",
  9:  "You are already subscribed to this plan",
  10: "Interval must be at least 1 hour (3600 seconds)",
  11: "Amount must be greater than zero",
  12: "Contract has already been initialized",
};

/** Parse a Soroban contract error into a user-friendly message */
export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    // Soroban errors include the error code in the message
    const match = error.message.match(/Error\(Contract, #(\d+)\)/);
    if (match) {
      const code = parseInt(match[1], 10);
      return CONTRACT_ERRORS[code] || `Contract error #${code}`;
    }
    if (error.message.includes("User declined") || error.message.includes("user") || error.message.includes("cancel") || error.message.includes("reject")) {
      return "Transaction was rejected by the wallet";
    }
    return error.message;
  }
  return "An unknown error occurred";
}
