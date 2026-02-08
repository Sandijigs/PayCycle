"use client";

import SendXLM from "@/components/transaction/SendXLM";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { ArrowRight, Shield, Zap, Clock, Droplets, Loader2 } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { address, isConnected } = useWallet();
  const { xlm, refetch } = useBalance(address);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-10">
      {/* Hero — compact when connected */}
      <section className={`relative text-center ${isConnected ? "py-8" : "py-16"}`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {!isConnected && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full gradient-brand-subtle border border-primary/10 text-sm font-medium text-primary mb-6">
              <Zap className="h-3.5 w-3.5" />
              Programmable Recurring Payments on Stellar
            </div>
          )}

          <h1 className={`font-bold tracking-tight mb-4 ${isConnected ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl mb-6"}`}>
            <span className="text-foreground">Subscribe once.</span>
            {" "}
            <span className="gradient-text">Pay automatically.</span>
          </h1>

          <p className={`text-muted-foreground max-w-xl mx-auto leading-relaxed ${isConnected ? "text-base" : "text-lg"}`}>
            The first pre-authorized debit protocol on Soroban.
            Self-custodial, transparent, cancellable anytime.
          </p>

          {!isConnected && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <ArrowRight className="h-4 w-4 animate-pulse" />
              Connect your Freighter wallet to get started
            </div>
          )}
        </div>
      </section>

      {/* Feature pills */}
      <section className="flex flex-wrap justify-center gap-3">
        {[
          { icon: Shield, label: "Self-Custodial", desc: "Your keys, your funds" },
          { icon: Zap, label: "Sub-Cent Fees", desc: "Powered by Stellar" },
          { icon: Clock, label: "Cancel Anytime", desc: "One click, instant" },
        ].map((feature) => (
          <div
            key={feature.label}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:glow-primary transition-all duration-300"
          >
            <div className="h-9 w-9 rounded-xl gradient-brand-subtle flex items-center justify-center">
              <feature.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{feature.label}</p>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Friendbot banner — only when connected with zero balance */}
      {isConnected && (xlm === "0" || !xlm) && (
        <section className="max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-primary/20 gradient-brand-subtle">
            <div>
              <p className="text-sm font-semibold text-foreground">Account not funded</p>
              <p className="text-xs text-muted-foreground">
                Get free testnet XLM from Friendbot to start transacting
              </p>
            </div>
            <button
              onClick={handleFundWithFriendbot}
              disabled={isFunding}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-brand text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isFunding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Funding...
                </>
              ) : (
                <>
                  <Droplets className="h-4 w-4" />
                  Fund Account
                </>
              )}
            </button>
          </div>
          {fundingMessage && (
            <p
              className={`text-sm font-medium mt-2 text-center ${
                fundingMessage.includes("Success")
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              {fundingMessage}
            </p>
          )}
        </section>
      )}

      {/* Send XLM — centered action card */}
      {isConnected && (
        <section className="max-w-xl mx-auto">
          <SendXLM />
        </section>
      )}
    </div>
  );
}
