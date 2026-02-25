"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import * as StellarSdk from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/stellar";
import { CONTRACTS } from "@/lib/contracts";
import type { PlanData, SubscriptionData, CreatePlanParams, TxStatus } from "@/types/subscription";
import { parseContractError } from "@/types/subscription";

const CONTRACT_ID = CONTRACTS.subscription;

/**
 * Core Soroban interaction hook for the PayCycle subscription contract.
 *
 * Provides two primitives:
 *   queryContract  - read-only simulation (no signing)
 *   invokeContract - full lifecycle: simulate -> assemble -> sign -> submit -> poll
 */
export function useSubscription() {
  const { address, kit } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();

  // ---------- INTERNAL HELPERS ----------

  const getServer = useCallback(() => {
    return new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  }, []);

  const getContract = useCallback(() => {
    return new StellarSdk.Contract(CONTRACT_ID);
  }, []);

  /**
   * Read-only contract call via simulation.
   * Does NOT require a wallet signature.
   * Returns the scVal result, decoded with scValToNative.
   */
  const queryContract = useCallback(
    async (method: string, ...args: StellarSdk.xdr.ScVal[]) => {
      const server = getServer();
      const contract = getContract();

      // For read-only, we need a source account. Use a dummy source for simulation.
      const sourceAccount = address
        || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

      const account = await server.getAccount(sourceAccount);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);

      if (StellarSdk.rpc.Api.isSimulationError(sim)) {
        throw new Error(
          (sim as any).error || "Simulation failed"
        );
      }

      // Extract result from successful simulation
      const result = (sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result;
      if (!result) {
        return undefined;
      }
      return StellarSdk.scValToNative(result.retval);
    },
    [address, getServer, getContract]
  );

  /**
   * Full write-path contract invocation:
   * 1. Build transaction with contract.call()
   * 2. Simulate
   * 3. Assemble (adds auth, footprint, resource fees)
   * 4. Sign via wallet (StellarWalletsKit)
   * 5. Submit to network
   * 6. Poll for finality
   * Returns the native-decoded result value.
   */
  const invokeContract = useCallback(
    async (method: string, ...args: StellarSdk.xdr.ScVal[]) => {
      if (!address || !kit) {
        const msg = "Wallet not connected";
        setError(msg);
        setTxStatus("error");
        throw new Error(msg);
      }

      const server = getServer();
      const contract = getContract();

      setIsLoading(true);
      setError(null);
      setTxStatus("signing");
      setTxHash(undefined);

      try {
        // 1. Build
        const account = await server.getAccount(address);
        const tx = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call(method, ...args))
          .setTimeout(180)
          .build();

        // 2. Simulate
        const sim = await server.simulateTransaction(tx);

        if (StellarSdk.rpc.Api.isSimulationError(sim)) {
          throw new Error(
            (sim as any).error || "Transaction simulation failed"
          );
        }

        // 3. Assemble (adds footprint + auth + resource fees)
        const assembled = StellarSdk.rpc.assembleTransaction(
          tx,
          sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
        ).build();

        // 4. Sign via wallet
        const xdr = assembled.toXDR();
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        setTxStatus("submitting");

        // 5. Submit
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
          signedTxXdr,
          NETWORK_PASSPHRASE
        );
        const sendResult = await server.sendTransaction(signedTx);

        if (sendResult.status === "ERROR") {
          throw new Error("Transaction submission failed");
        }

        // 6. Poll for finality
        const hash = sendResult.hash;
        setTxHash(hash);

        let getResult = await server.getTransaction(hash);
        while (getResult.status === "NOT_FOUND") {
          await new Promise((r) => setTimeout(r, 2000));
          getResult = await server.getTransaction(hash);
        }

        if (getResult.status === "SUCCESS") {
          setTxStatus("success");
          // Decode return value
          const returnVal = getResult.returnValue;
          if (returnVal) {
            return StellarSdk.scValToNative(returnVal);
          }
          return undefined;
        } else {
          throw new Error("Transaction failed on-chain");
        }
      } catch (err: unknown) {
        const message = parseContractError(err);
        setError(message);
        setTxStatus("error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, kit, getServer, getContract]
  );

  // ---------- PUBLIC API ----------

  /** Create a new subscription plan. Returns plan_id. */
  const createPlan = useCallback(
    async (params: CreatePlanParams): Promise<number> => {
      const result = await invokeContract(
        "create_plan",
        StellarSdk.nativeToScVal(address!, { type: "address" }),
        StellarSdk.nativeToScVal(params.token, { type: "address" }),
        StellarSdk.nativeToScVal(params.amount, { type: "i128" }),
        StellarSdk.nativeToScVal(params.interval, { type: "u64" }),
        StellarSdk.nativeToScVal(params.name, { type: "string" }),
      );
      return Number(result);
    },
    [address, invokeContract]
  );

  /** Fetch a single plan by ID. Read-only. */
  const getPlan = useCallback(
    async (planId: number): Promise<PlanData> => {
      const result = await queryContract(
        "get_plan",
        StellarSdk.nativeToScVal(planId, { type: "u64" }),
      );
      // scValToNative decodes struct fields to a JS object
      return {
        id: planId,
        merchant: result.merchant as string,
        token: result.token as string,
        amount: BigInt(result.amount),
        interval: Number(result.interval),
        name: result.name as string,
        status: mapPlanStatus(result.status),
        subscriberCount: Number(result.subscriber_count),
        createdAt: Number(result.created_at),
      };
    },
    [queryContract]
  );

  /** Get total plan count. Read-only. */
  const getPlanCount = useCallback(
    async (): Promise<number> => {
      const result = await queryContract("get_plan_count");
      return Number(result);
    },
    [queryContract]
  );

  /** Fetch all plans created by a specific merchant address. */
  const getMerchantPlans = useCallback(
    async (merchantAddress: string): Promise<PlanData[]> => {
      const count = await getPlanCount();
      const plans: PlanData[] = [];

      // Plan IDs are 1-indexed (first plan = 1)
      for (let i = 1; i <= count; i++) {
        try {
          const plan = await getPlan(i);
          if (plan.merchant === merchantAddress) {
            plans.push(plan);
          }
        } catch {
          // Plan may have been removed or errored; skip
          continue;
        }
      }
      return plans;
    },
    [getPlanCount, getPlan]
  );

  /** Subscribe to a plan. Returns subscription_id. */
  const subscribe = useCallback(
    async (planId: number, maxAmount: bigint): Promise<number> => {
      const result = await invokeContract(
        "subscribe",
        StellarSdk.nativeToScVal(address!, { type: "address" }),
        StellarSdk.nativeToScVal(planId, { type: "u64" }),
        StellarSdk.nativeToScVal(maxAmount, { type: "i128" }),
      );
      return Number(result);
    },
    [address, invokeContract]
  );

  /** Execute a scheduled payment. Returns boolean success. */
  const executePayment = useCallback(
    async (subscriptionId: number): Promise<boolean> => {
      const result = await invokeContract(
        "execute_payment",
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
      );
      return Boolean(result);
    },
    [invokeContract]
  );

  /** Cancel a subscription. */
  const cancel = useCallback(
    async (subscriptionId: number): Promise<void> => {
      await invokeContract(
        "cancel",
        StellarSdk.nativeToScVal(address!, { type: "address" }),
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
      );
    },
    [address, invokeContract]
  );

  /** Pause a subscription. */
  const pause = useCallback(
    async (subscriptionId: number): Promise<void> => {
      await invokeContract(
        "pause",
        StellarSdk.nativeToScVal(address!, { type: "address" }),
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
      );
    },
    [address, invokeContract]
  );

  /** Resume a paused subscription. */
  const resume = useCallback(
    async (subscriptionId: number): Promise<void> => {
      await invokeContract(
        "resume",
        StellarSdk.nativeToScVal(address!, { type: "address" }),
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
      );
    },
    [address, invokeContract]
  );

  /** Get a single subscription by ID. */
  const getSubscription = useCallback(
    async (subscriptionId: number): Promise<SubscriptionData> => {
      const result = await queryContract(
        "get_subscription",
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" }),
      );

      const data = StellarSdk.scValToNative(result);
      return {
        id: subscriptionId,
        subscriber: data.subscriber,
        planId: Number(data.plan_id),
        maxAmount: BigInt(data.max_amount),
        status: mapSubscriptionStatus(data.status),
        lastPayment: Number(data.last_payment),
        nextPayment: Number(data.next_payment),
        paymentsMade: Number(data.payments_made),
        createdAt: Number(data.created_at),
      };
    },
    [queryContract]
  );

  /** Get all subscription IDs for a user address. */
  const getUserSubscriptions = useCallback(
    async (userAddress: string): Promise<number[]> => {
      const addr = new StellarSdk.Address(userAddress);
      const result = await queryContract(
        "get_user_subscriptions",
        addr.toScVal(),
      );

      const native = StellarSdk.scValToNative(result);
      if (Array.isArray(native)) {
        return native.map((id: any) => Number(id));
      }
      return [];
    },
    [queryContract]
  );

  /** Reset transaction state to idle. */
  const resetTx = useCallback(() => {
    setTxStatus("idle");
    setTxHash(undefined);
    setError(null);
  }, []);

  return {
    // Write methods
    createPlan,
    subscribe,
    executePayment,
    cancel,
    pause,
    resume,
    // Read methods
    getPlan,
    getPlanCount,
    getMerchantPlans,
    getSubscription,
    getUserSubscriptions,
    // State
    isLoading,
    error,
    txStatus,
    txHash,
    resetTx,
  };
}

// ---------- INTERNAL UTILITIES ----------

/** Map Soroban enum variant to TypeScript PlanStatus string */
function mapPlanStatus(raw: unknown): "Active" | "Paused" | "Cancelled" {
  // scValToNative decodes Soroban enums differently depending on sdk version.
  // Typically it's a string like "Active" or an object { tag: "Active" }.
  if (typeof raw === "string") return raw as any;
  if (typeof raw === "object" && raw !== null && "tag" in raw) {
    return (raw as { tag: string }).tag as any;
  }
  return "Active"; // fallback
}

/** Map Soroban enum variant to TypeScript SubscriptionStatus string */
function mapSubscriptionStatus(raw: unknown): "Active" | "Paused" | "Cancelled" | "Expired" {
  if (typeof raw === "string") return raw as any;
  if (typeof raw === "object" && raw !== null && "tag" in raw) {
    return (raw as { tag: string }).tag as any;
  }
  return "Active"; // fallback
}
