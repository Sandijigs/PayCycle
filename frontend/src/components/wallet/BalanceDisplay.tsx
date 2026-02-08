"use client";

import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { RefreshCw, Loader2, Wallet, Droplets, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function BalanceDisplay() {
  const { address, isConnected } = useWallet();
  const { xlm, isLoading, error, refetch } = useBalance(address);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFundWithFriendbot = async () => {
    if (!address) return;

    setIsFunding(true);
    setFundingMessage(null);

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${address}`
      );

      if (response.ok) {
        setFundingMessage("Successfully funded with 10,000 XLM!");
        setTimeout(() => refetch(), 2000);
      } else {
        setFundingMessage("Friendbot funding failed. Try again later.");
      }
    } catch (err) {
      setFundingMessage("Error connecting to Friendbot");
      console.error("Friendbot error:", err);
    } finally {
      setIsFunding(false);
      setTimeout(() => setFundingMessage(null), 5000);
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center justify-center min-h-[280px] text-center">
        <div className="h-14 w-14 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-4">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <p className="text-lg font-semibold text-foreground mb-1">Your Wallet</p>
        <p className="text-sm text-muted-foreground">
          Connect your wallet to view your balance
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
      {/* Gradient header with balance */}
      <div className="gradient-brand p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/70">XLM Balance</p>
          {!isLoading && (
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-white" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/60" />
            <p className="text-white/60">Loading...</p>
          </div>
        ) : error ? (
          <p className="text-lg text-white/80">Error loading balance</p>
        ) : (
          <div>
            <span className="text-4xl font-bold text-white tracking-tight">
              {xlm ? parseFloat(xlm).toLocaleString() : "0"}
            </span>
            <span className="text-lg text-white/70 ml-2">XLM</span>
          </div>
        )}
      </div>

      {/* Info rows */}
      <div className="p-5 space-y-3 flex-1">
        {/* Wallet address */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-background border border-border/50">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Wallet</p>
            <p className="text-sm font-mono text-foreground truncate">
              {address ? `${address.slice(0, 8)}...${address.slice(-8)}` : ""}
            </p>
          </div>
          <button
            onClick={copyAddress}
            className="ml-2 p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            title="Copy address"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-background border border-border/50">
          <p className="text-xs text-muted-foreground">Network</p>
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Stellar Testnet
          </span>
        </div>

        {/* Friendbot or status */}
        {xlm === "0" || !xlm ? (
          <button
            onClick={handleFundWithFriendbot}
            disabled={isFunding}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {isFunding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Funding...
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4" />
                Fund with Friendbot
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-background border border-border/50">
            <p className="text-xs text-muted-foreground">Status</p>
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Active
            </span>
          </div>
        )}

        {fundingMessage && (
          <div
            className={`text-sm font-medium px-3 ${
              fundingMessage.includes("Success")
                ? "text-green-600"
                : "text-destructive"
            }`}
          >
            {fundingMessage}
          </div>
        )}
      </div>
    </div>
  );
}
