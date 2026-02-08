"use client";

import { useWalletContext } from "@/components/wallet/WalletProvider";

export function useWallet() {
  return useWalletContext();
}
