"use client";

import { useWalletContext } from "@/components/wallet/WalletProvider";

/**
 * Convenience re-export of the wallet context.
 *
 * Returns `{ kit, address, isConnected, isConnecting, connect, disconnect, network }`
 * from the nearest `<WalletProvider>`.
 */
export function useWallet() {
  return useWalletContext();
}
