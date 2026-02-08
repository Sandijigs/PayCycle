"use client";

import { useQuery } from "@tanstack/react-query";

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";

interface Balance {
  xlm: string | null;
  usdc: string | null;
  plc: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function fetchBalance(address: string): Promise<string> {
  const response = await fetch(`${HORIZON_URL}/accounts/${address}`);

  if (!response.ok) {
    if (response.status === 404) {
      // Account not found = not funded yet
      return "0";
    }
    throw new Error(`Failed to fetch balance: ${response.statusText}`);
  }

  const data = await response.json();
  const nativeBalance = data.balances.find(
    (balance: { asset_type: string }) => balance.asset_type === "native"
  );

  return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : "0";
}

export function useBalance(address: string | null): Balance {
  const {
    data: xlm,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["balance", address],
    queryFn: () => fetchBalance(address!),
    enabled: !!address,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    xlm: xlm ?? null,
    usdc: null, // TODO: Implement in later belt
    plc: null, // TODO: Implement in later belt
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
