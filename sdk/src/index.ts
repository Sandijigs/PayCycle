// @paycycle/sdk — TypeScript SDK
// TODO: Green Belt — Implement full SDK
//
// Usage:
//   import { PayCycle } from '@paycycle/sdk';
//   const paycycle = new PayCycle({ network: 'testnet', contractId: 'C...' });
//   const plan = await paycycle.createPlan({ ... });
//   const sub = await paycycle.subscribe({ planId: plan.id, maxAmount: 10_0000000n });
//   await paycycle.executePayment(sub.id);

export interface PayCycleConfig {
  network: "testnet" | "mainnet";
  contractId: string;
  rpcUrl?: string;
}

export interface CreatePlanParams {
  merchant: string;
  token: string;
  amount: bigint;
  interval: number;
  name: string;
}

export interface SubscribeParams {
  subscriber: string;
  planId: number;
  maxAmount: bigint;
}

export class PayCycle {
  private config: PayCycleConfig;

  constructor(config: PayCycleConfig) {
    this.config = config;
    // TODO: Initialize Soroban RPC client + contract client
  }

  async createPlan(params: CreatePlanParams): Promise<{ id: number }> {
    // TODO: Build + submit create_plan transaction
    throw new Error("Not implemented — implement at Green Belt");
  }

  async subscribe(params: SubscribeParams): Promise<{ id: number }> {
    // TODO: Build + submit subscribe transaction
    throw new Error("Not implemented — implement at Green Belt");
  }

  async executePayment(subscriptionId: number): Promise<boolean> {
    // TODO: Build + submit execute_payment transaction
    throw new Error("Not implemented — implement at Green Belt");
  }

  async cancel(subscriber: string, subscriptionId: number): Promise<void> {
    throw new Error("Not implemented — implement at Green Belt");
  }

  async pause(subscriber: string, subscriptionId: number): Promise<void> {
    throw new Error("Not implemented — implement at Green Belt");
  }

  async resume(subscriber: string, subscriptionId: number): Promise<void> {
    throw new Error("Not implemented — implement at Green Belt");
  }

  async getPlan(planId: number): Promise<any> {
    throw new Error("Not implemented — implement at Green Belt");
  }

  async getSubscription(subscriptionId: number): Promise<any> {
    throw new Error("Not implemented — implement at Green Belt");
  }
}

export default PayCycle;
