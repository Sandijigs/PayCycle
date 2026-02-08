"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/stellar";
import * as StellarSdk from "@stellar/stellar-sdk";
import { TxStatusType } from "@/components/transaction/TxStatus";

const CONTRACT_ID = CONTRACTS.subscription;

// Map contract error codes to user-friendly messages
const CONTRACT_ERRORS: Record<number, string> = {
  1: "Not authorized to perform this action",
  2: "Plan not found",
  3: "Subscription not found",
  4: "Invalid subscription status for this operation",
  5: "Insufficient balance",
  6: "Payment is not due yet",
  7: "Amount exceeds spending cap",
  8: "Plan is inactive",
  9: "Already subscribed to this plan",
  10: "Interval too short (min 1 hour)",
  11: "Amount must be greater than zero",
  12: "Contract is already initialized",
};

function parseContractError(error: unknown): string {
  const msg = String(error);
  const match = msg.match(/Error\(Contract, #(\d+)\)/);
  if (match) {
    const code = parseInt(match[1], 10);
    return CONTRACT_ERRORS[code] || `Contract error #${code}`;
  }
  if (msg.includes("user") || msg.includes("cancel") || msg.includes("reject")) {
    return "Transaction rejected by user";
  }
  if (msg.includes("timeout")) {
    return "Transaction timed out";
  }
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

export function useSubscription() {
  const { address, kit } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatusType>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();

  const rpcServer = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

  const invokeContract = useCallback(
    async (method: string, ...params: StellarSdk.xdr.ScVal[]): Promise<StellarSdk.rpc.Api.GetSuccessfulTransactionResponse> => {
      if (!address || !kit) throw new Error("Wallet not connected");
      if (!CONTRACT_ID) throw new Error("Subscription contract not configured");

      setError(null);
      setTxHash(undefined);
      setIsLoading(true);
      setTxStatus("signing");

      try {
        const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
        const account = await server.getAccount(address);
        const contract = new StellarSdk.Contract(CONTRACT_ID);

        const tx = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call(method, ...params))
          .setTimeout(180)
          .build();

        // Simulate to get resource estimates
        const simResponse = await server.simulateTransaction(tx);

        if (StellarSdk.rpc.Api.isSimulationError(simResponse)) {
          throw new Error(
            (simResponse as StellarSdk.rpc.Api.SimulateTransactionErrorResponse).error ||
              "Simulation failed"
          );
        }

        // Assemble with resource estimates
        const assembled = StellarSdk.rpc.assembleTransaction(tx, simResponse).build();

        // Sign via wallet
        const xdr = assembled.toXDR();
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        setTxStatus("submitting");

        // Submit
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
          signedTxXdr,
          NETWORK_PASSPHRASE
        ) as StellarSdk.Transaction;
        const sendResponse = await server.sendTransaction(signedTx);

        if (sendResponse.status === "ERROR") {
          throw new Error("Transaction submission failed");
        }

        // Poll for result
        let getResponse: StellarSdk.rpc.Api.GetTransactionResponse;
        const maxWait = 30;
        for (let i = 0; i < maxWait; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          getResponse = await server.getTransaction(sendResponse.hash);
          if (getResponse.status !== "NOT_FOUND") break;
        }

        getResponse = await server.getTransaction(sendResponse.hash);

        if (getResponse.status === "SUCCESS") {
          setTxStatus("success");
          setTxHash(sendResponse.hash);
          return getResponse as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
        } else {
          throw new Error(`Transaction failed with status: ${getResponse.status}`);
        }
      } catch (err) {
        const message = parseContractError(err);
        setError(message);
        setTxStatus("error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, kit]
  );

  const queryContract = useCallback(
    async (method: string, ...params: StellarSdk.xdr.ScVal[]): Promise<StellarSdk.xdr.ScVal | undefined> => {
      if (!CONTRACT_ID) throw new Error("Subscription contract not configured");

      const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
      const contract = new StellarSdk.Contract(CONTRACT_ID);

      // Use a dummy source account for read-only queries
      const sourceKey = StellarSdk.Keypair.random();
      const account = new StellarSdk.Account(sourceKey.publicKey(), "0");

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...params))
        .setTimeout(30)
        .build();

      const simResponse = await server.simulateTransaction(tx);

      if (StellarSdk.rpc.Api.isSimulationError(simResponse)) {
        throw new Error(
          (simResponse as StellarSdk.rpc.Api.SimulateTransactionErrorResponse).error ||
            "Query failed"
        );
      }

      const successSim = simResponse as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;
      return successSim.result?.retval;
    },
    []
  );

  // ── Contract methods ──

  const createPlan = useCallback(
    async (params: {
      token: string;
      amount: bigint;
      interval: number;
      name: string;
    }) => {
      if (!address) throw new Error("Wallet not connected");

      const result = await invokeContract(
        "create_plan",
        StellarSdk.nativeToScVal(address, { type: "address" }),
        StellarSdk.nativeToScVal(params.token, { type: "address" }),
        StellarSdk.nativeToScVal(params.amount, { type: "i128" }),
        StellarSdk.nativeToScVal(params.interval, { type: "u64" }),
        StellarSdk.nativeToScVal(params.name, { type: "string" })
      );

      if (result.returnValue) {
        return Number(StellarSdk.scValToNative(result.returnValue));
      }
      return 0;
    },
    [address, invokeContract]
  );

  const subscribe = useCallback(
    async (planId: number, maxAmount: bigint) => {
      if (!address) throw new Error("Wallet not connected");

      const result = await invokeContract(
        "subscribe",
        StellarSdk.nativeToScVal(address, { type: "address" }),
        StellarSdk.nativeToScVal(planId, { type: "u64" }),
        StellarSdk.nativeToScVal(maxAmount, { type: "i128" })
      );

      if (result.returnValue) {
        return Number(StellarSdk.scValToNative(result.returnValue));
      }
      return 0;
    },
    [address, invokeContract]
  );

  const executePayment = useCallback(
    async (subscriptionId: number) => {
      const result = await invokeContract(
        "execute_payment",
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" })
      );

      if (result.returnValue) {
        return StellarSdk.scValToNative(result.returnValue) as boolean;
      }
      return false;
    },
    [invokeContract]
  );

  const cancel = useCallback(
    async (subscriptionId: number) => {
      if (!address) throw new Error("Wallet not connected");

      await invokeContract(
        "cancel",
        StellarSdk.nativeToScVal(address, { type: "address" }),
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" })
      );
    },
    [address, invokeContract]
  );

  const pause = useCallback(
    async (subscriptionId: number) => {
      if (!address) throw new Error("Wallet not connected");

      await invokeContract(
        "pause",
        StellarSdk.nativeToScVal(address, { type: "address" }),
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" })
      );
    },
    [address, invokeContract]
  );

  const resume = useCallback(
    async (subscriptionId: number) => {
      if (!address) throw new Error("Wallet not connected");

      await invokeContract(
        "resume",
        StellarSdk.nativeToScVal(address, { type: "address" }),
        StellarSdk.nativeToScVal(subscriptionId, { type: "u64" })
      );
    },
    [address, invokeContract]
  );

  const getPlan = useCallback(
    async (planId: number) => {
      const retval = await queryContract(
        "get_plan",
        StellarSdk.nativeToScVal(planId, { type: "u64" })
      );
      if (retval) {
        return StellarSdk.scValToNative(retval);
      }
      return null;
    },
    [queryContract]
  );

  const getSubscription = useCallback(
    async (subId: number) => {
      const retval = await queryContract(
        "get_subscription",
        StellarSdk.nativeToScVal(subId, { type: "u64" })
      );
      if (retval) {
        return StellarSdk.scValToNative(retval);
      }
      return null;
    },
    [queryContract]
  );

  const resetStatus = useCallback(() => {
    setTxStatus("idle");
    setTxHash(undefined);
    setError(null);
  }, []);

  return {
    createPlan,
    subscribe,
    executePayment,
    cancel,
    pause,
    resume,
    getPlan,
    getSubscription,
    isLoading,
    error,
    txStatus,
    txHash,
    resetStatus,
  };
}
