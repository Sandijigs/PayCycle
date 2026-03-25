"use client";

import { useQuery } from "@tanstack/react-query";
import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACTS } from "@/lib/contracts";

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

interface Balance {
  xlm: string | null;
  plc: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function fetchXlmBalance(address: string): Promise<string> {
  const response = await fetch(`${HORIZON_URL}/accounts/${address}`);

  if (!response.ok) {
    if (response.status === 404) return "0";
    throw new Error(`Failed to fetch balance: ${response.statusText}`);
  }

  const data = await response.json();
  const nativeBalance = data.balances.find(
    (balance: { asset_type: string }) => balance.asset_type === "native"
  );

  return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : "0";
}

async function fetchPlcBalance(address: string): Promise<string> {
  const plcTokenId = CONTRACTS.token;
  if (!plcTokenId) return "0";

  try {
    const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
    const contract = new StellarSdk.Contract(plcTokenId);
    const source = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const account = await server.getAccount(source);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "balance",
          StellarSdk.nativeToScVal(address, { type: "address" })
        )
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(sim)) return "0";

    const result = (sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result;
    if (!result) return "0";

    const raw = StellarSdk.scValToNative(result.retval);
    const stroops = BigInt(raw);
    const divisor = BigInt(10000000);
    const whole = stroops / divisor;
    const frac = (stroops % divisor).toString().padStart(7, "0").slice(0, 2);
    return `${whole}.${frac}`;
  } catch {
    return "0";
  }
}

export function useBalance(address: string | null): Balance {
  const {
    data: xlm,
    isLoading: xlmLoading,
    error: xlmError,
    refetch: refetchXlm,
  } = useQuery({
    queryKey: ["balance", "xlm", address],
    queryFn: () => fetchXlmBalance(address!),
    enabled: !!address,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const {
    data: plc,
    isLoading: plcLoading,
    refetch: refetchPlc,
  } = useQuery({
    queryKey: ["balance", "plc", address],
    queryFn: () => fetchPlcBalance(address!),
    enabled: !!address && !!CONTRACTS.token,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  return {
    xlm: xlm ?? null,
    plc: plc ?? null,
    isLoading: xlmLoading || plcLoading,
    error: xlmError as Error | null,
    refetch: () => { refetchXlm(); refetchPlc(); },
  };
}
