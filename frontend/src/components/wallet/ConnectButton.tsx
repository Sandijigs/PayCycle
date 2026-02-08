"use client";

import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { WalletNetwork } from "@creit.tech/stellar-wallets-kit";
import { Loader2, Wallet, LogOut, Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function ConnectButton() {
  const { address, isConnected, isConnecting, connect, disconnect, network } =
    useWallet();
  const { xlm, isLoading, refetch } = useBalance(address);
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConnecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Balance chip */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-card border border-border/50 text-sm">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {xlm ? parseFloat(xlm).toLocaleString() : "0"}
              </span>
              <span className="text-muted-foreground text-xs">XLM</span>
            </>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="Refresh balance"
          >
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        {/* Network chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-card border border-border/50 text-xs font-medium">
          <span className={`h-1.5 w-1.5 rounded-full ${network === WalletNetwork.TESTNET ? "bg-amber-500" : "bg-green-500"}`} />
          <span className="text-muted-foreground">
            {network === WalletNetwork.TESTNET ? "Testnet" : "Mainnet"}
          </span>
        </div>

        {/* Address chip — hidden on small screens */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border/50 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="font-mono font-medium text-foreground">
            {truncateAddress(address)}
          </span>
          <button
            onClick={copyAddress}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Disconnect */}
        <button
          onClick={disconnect}
          className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
          title="Disconnect"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-brand text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </button>
  );
}
