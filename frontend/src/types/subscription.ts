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
