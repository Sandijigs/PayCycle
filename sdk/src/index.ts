/**
 * @paycycle/sdk — TypeScript SDK for PayCycle Recurring Payments on Stellar
 *
 * Add subscriptions to your Stellar dApp in under 50 lines of code:
 *
 * ```ts
 * import { PayCycle, formatAmount, parseInterval } from "@paycycle/sdk";
 *
 * const pc = new PayCycle({ network: "testnet", contractId: "CBSG3..." });
 *
 * // Query a plan (read-only, no wallet needed)
 * const plan = await pc.getPlan(1);
 *
 * // Build an unsigned transaction (sign with any Stellar wallet)
 * const tx = await pc.createPlan({
 *   merchant: "G...",
 *   token: "CDLZ...",
 *   amount: formatAmount(10),    // 10 tokens
 *   interval: parseInterval("monthly"),
 *   name: "Pro Plan",
 * });
 *
 * // Option A: Get the XDR and sign yourself
 * const xdr = tx.toXDR();
 *
 * // Option B: One-liner with signAndSend
 * const result = await tx.signAndSend(myWalletSignFn);
 * ```
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  getDefaultRpcUrl,
  getNetworkPassphrase,
  mapPlanStatus,
  mapSubscriptionStatus,
} from "./helpers";
import type {
  PayCycleConfig,
  CreatePlanParams,
  SubscribeParams,
  PlanData,
  SubscriptionData,
  PreparedTransaction,
  TransactionResult,
  SignTransactionFn,
} from "./types";

// Re-export everything for consumers
export * from "./types";
export * from "./helpers";

export class PayCycle {
  private rpcUrl: string;
  private passphrase: string;
  private contractId: string;
  private plcTokenId?: string;
  private keeperId?: string;

  constructor(config: PayCycleConfig) {
    this.rpcUrl = config.rpcUrl || getDefaultRpcUrl(config.network);
    this.passphrase = getNetworkPassphrase(config.network);
    this.contractId = config.contractId;
    this.plcTokenId = config.plcTokenId;
    this.keeperId = config.keeperId;
  }

  // ──────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────

  private server(): StellarSdk.rpc.Server {
    return new StellarSdk.rpc.Server(this.rpcUrl);
  }

  private contract(id?: string): StellarSdk.Contract {
    return new StellarSdk.Contract(id || this.contractId);
  }

  /**
   * Build an unsigned transaction for a contract invocation.
   * Returns a PreparedTransaction that can be signed and submitted.
   */
  private async buildTx(
    sourceAddress: string,
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[]
  ): Promise<PreparedTransaction> {
    const server = this.server();
    const contract = this.contract(contractId);
    const account = await server.getAccount(sourceAddress);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.passphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(180)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      throw new Error((sim as any).error || "Transaction simulation failed");
    }

    const assembled = StellarSdk.rpc.assembleTransaction(
      tx,
      sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
    ).build();

    const passphrase = this.passphrase;
    const rpcUrl = this.rpcUrl;

    return {
      toXDR: () => assembled.toXDR(),
      signAndSend: async (
        signTransaction: SignTransactionFn
      ): Promise<TransactionResult> => {
        const signedXdr = await signTransaction(assembled.toXDR(), {
          networkPassphrase: passphrase,
        });
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
          signedXdr,
          passphrase
        );

        const srv = new StellarSdk.rpc.Server(rpcUrl);
        const sendResult = await srv.sendTransaction(signedTx);
        if (sendResult.status === "ERROR") {
          throw new Error("Transaction submission failed");
        }

        const hash = sendResult.hash;
        let getResult = await srv.getTransaction(hash);
        while (getResult.status === "NOT_FOUND") {
          await new Promise((r) => setTimeout(r, 2000));
          getResult = await srv.getTransaction(hash);
        }

        if (getResult.status === "SUCCESS") {
          return {
            success: true,
            hash,
            returnValue: getResult.returnValue
              ? StellarSdk.scValToNative(getResult.returnValue)
              : undefined,
          };
        }
        throw new Error(`Transaction failed: ${getResult.status}`);
      },
    };
  }

  /**
   * Read-only contract query via simulation (no signing needed).
   */
  private async query(
    method: string,
    args: StellarSdk.xdr.ScVal[],
    contractId?: string
  ): Promise<unknown> {
    const server = this.server();
    const contract = this.contract(contractId);
    // Use a dummy source for read-only simulation
    const source = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const account = await server.getAccount(source);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.passphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      throw new Error((sim as any).error || "Simulation failed");
    }

    const result = (
      sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
    ).result;
    if (!result) return undefined;
    return StellarSdk.scValToNative(result.retval);
  }

  // ──────────────────────────────────────────────
  // WRITE METHODS (return unsigned transactions)
  // ──────────────────────────────────────────────

  /** Create a subscription plan. Returns an unsigned transaction. */
  async createPlan(params: CreatePlanParams): Promise<PreparedTransaction> {
    return this.buildTx(params.merchant, this.contractId, "create_plan", [
      StellarSdk.nativeToScVal(params.merchant, { type: "address" }),
      StellarSdk.nativeToScVal(params.token, { type: "address" }),
      StellarSdk.nativeToScVal(params.amount, { type: "i128" }),
      StellarSdk.nativeToScVal(params.interval, { type: "u64" }),
      StellarSdk.nativeToScVal(params.name, { type: "string" }),
    ]);
  }

  /** Subscribe to a plan. Returns an unsigned transaction. */
  async subscribe(params: SubscribeParams): Promise<PreparedTransaction> {
    return this.buildTx(params.subscriber, this.contractId, "subscribe", [
      StellarSdk.nativeToScVal(params.subscriber, { type: "address" }),
      StellarSdk.nativeToScVal(params.planId, { type: "u64" }),
      StellarSdk.nativeToScVal(params.maxAmount, { type: "i128" }),
    ]);
  }

  /** Execute a due payment. Callable by anyone (keeper, merchant, subscriber). */
  async executePayment(
    callerAddress: string,
    subscriptionId: number
  ): Promise<PreparedTransaction> {
    return this.buildTx(
      callerAddress,
      this.contractId,
      "execute_payment",
      [StellarSdk.nativeToScVal(subscriptionId, { type: "u64" })]
    );
  }

  /** Cancel a subscription. Only the subscriber can cancel. */
  async cancel(
    subscriber: string,
    subscriptionId: number
  ): Promise<PreparedTransaction> {
    return this.buildTx(subscriber, this.contractId, "cancel", [
      StellarSdk.nativeToScVal(subscriber, { type: "address" }),
      StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
    ]);
  }

  /** Pause a subscription. Only the subscriber can pause. */
  async pause(
    subscriber: string,
    subscriptionId: number
  ): Promise<PreparedTransaction> {
    return this.buildTx(subscriber, this.contractId, "pause", [
      StellarSdk.nativeToScVal(subscriber, { type: "address" }),
      StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
    ]);
  }

  /** Resume a paused subscription. Only the subscriber can resume. */
  async resume(
    subscriber: string,
    subscriptionId: number
  ): Promise<PreparedTransaction> {
    return this.buildTx(subscriber, this.contractId, "resume", [
      StellarSdk.nativeToScVal(subscriber, { type: "address" }),
      StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
    ]);
  }

  // ──────────────────────────────────────────────
  // READ METHODS (no wallet needed)
  // ──────────────────────────────────────────────

  /** Get a subscription plan by ID. */
  async getPlan(planId: number): Promise<PlanData> {
    const raw: any = await this.query("get_plan", [
      StellarSdk.nativeToScVal(planId, { type: "u64" }),
    ]);
    return {
      id: planId,
      merchant: raw.merchant,
      token: raw.token,
      amount: BigInt(raw.amount),
      interval: Number(raw.interval),
      name: raw.name,
      status: mapPlanStatus(raw.status),
      subscriberCount: Number(raw.subscriber_count),
      createdAt: Number(raw.created_at),
    };
  }

  /** Get a subscription by ID. */
  async getSubscription(subscriptionId: number): Promise<SubscriptionData> {
    const raw: any = await this.query("get_subscription", [
      StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
    ]);
    return {
      id: subscriptionId,
      subscriber: raw.subscriber,
      planId: Number(raw.plan_id),
      maxAmount: BigInt(raw.max_amount),
      status: mapSubscriptionStatus(raw.status),
      lastPayment: Number(raw.last_payment),
      nextPayment: Number(raw.next_payment),
      paymentsMade: Number(raw.payments_made),
      createdAt: Number(raw.created_at),
    };
  }

  /** Get all subscription IDs for a user. */
  async getUserSubscriptions(userAddress: string): Promise<number[]> {
    const addr = new StellarSdk.Address(userAddress);
    const raw: any = await this.query("get_user_subscriptions", [
      addr.toScVal(),
    ]);
    if (Array.isArray(raw)) return raw.map((id: any) => Number(id));
    return [];
  }

  /** Get total plan count. */
  async getPlanCount(): Promise<number> {
    const raw = await this.query("get_plan_count", []);
    return Number(raw);
  }

  /** Get total subscription count. */
  async getSubCount(): Promise<number> {
    const raw = await this.query("get_sub_count", []);
    return Number(raw);
  }

  /** Get all active plans (iterates through all plans). */
  async getAllPlans(): Promise<PlanData[]> {
    const count = await this.getPlanCount();
    const plans: PlanData[] = [];
    for (let i = 1; i <= count; i++) {
      try {
        plans.push(await this.getPlan(i));
      } catch {
        continue;
      }
    }
    return plans;
  }

  // ──────────────────────────────────────────────
  // PLC TOKEN METHODS (optional, requires plcTokenId)
  // ──────────────────────────────────────────────

  /** Get PLC token balance for an address. */
  async getPlcBalance(address: string): Promise<bigint> {
    if (!this.plcTokenId) throw new Error("plcTokenId not configured");
    const raw = await this.query(
      "balance",
      [StellarSdk.nativeToScVal(address, { type: "address" })],
      this.plcTokenId
    );
    return BigInt(raw as any);
  }

  // ──────────────────────────────────────────────
  // KEEPER METHODS (optional, requires keeperId)
  // ──────────────────────────────────────────────

  /** Execute payment and mint PLC rewards via keeper (inter-contract calls). */
  async executeAndReward(
    callerAddress: string,
    subscriptionId: number
  ): Promise<PreparedTransaction> {
    if (!this.keeperId) throw new Error("keeperId not configured");
    return this.buildTx(
      callerAddress,
      this.keeperId,
      "execute_and_reward",
      [StellarSdk.nativeToScVal(subscriptionId, { type: "u64" })]
    );
  }
}

export default PayCycle;
