"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useSubscription } from "@/hooks/useSubscription";
import SubscribeFlow from "@/components/subscription/SubscribeFlow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Clock,
  Shield,
  Zap,
  Wallet,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import type { PlanData } from "@/types/subscription";
import { resolveToken, formatAmount, formatInterval } from "@/lib/utils";

export default function ShareablePlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);

  const { isConnected, connect, isConnecting } = useWallet();
  const { getPlan } = useSubscription();

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch plan data
  useEffect(() => {
    if (isNaN(planId) || planId < 1) {
      setError("Invalid plan ID");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getPlan(planId);
        if (!cancelled) setPlan(data);
      } catch {
        if (!cancelled) setError("Plan not found");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [planId, getPlan]);

  // Resolve display values
  const token = plan ? resolveToken(plan.token) : { symbol: "TOKEN", decimals: 7 };
  const tokenSymbol = token.symbol;
  const displayAmount = plan ? formatAmount(plan.amount, token.decimals) : "0";
  const intervalDisplay = plan ? formatInterval(plan.interval) : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Card className="rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !plan) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">{error || "Plan not found"}</h1>
        <p className="text-muted-foreground">
          This plan may have been removed or the link may be incorrect.
        </p>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => router.push("/subscribe")}
        >
          Browse All Plans
        </Button>
      </div>
    );
  }

  // Inactive plan
  if (plan.status !== "Active") {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        <p className="text-muted-foreground">
          This plan is no longer accepting new subscribers.
        </p>
        <Badge variant="secondary">{plan.status}</Badge>
      </div>
    );
  }

  // Subscribe flow overlay
  if (showSubscribe && isConnected) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <SubscribeFlow
          plan={plan}
          onSuccess={() => {
            setShowSubscribe(false);
            router.push("/subscribe");
          }}
          onCancel={() => setShowSubscribe(false)}
        />
      </div>
    );
  }

  // Main plan view
  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      {/* PayCycle branding line */}
      <div className="text-center">
        <Badge variant="secondary" className="text-xs">
          PayCycle Subscription Plan
        </Badge>
      </div>

      {/* Plan card */}
      <Card className="rounded-2xl border-border/50 overflow-hidden">
        <div className="h-1.5 bg-primary" />
        <CardContent className="pt-6 space-y-6">
          {/* Plan name + status */}
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              by {plan.merchant.slice(0, 4)}...{plan.merchant.slice(-4)}
            </p>
          </div>

          {/* Price */}
          <div className="p-5 rounded-xl bg-background border border-border/50 text-center">
            <span className="text-4xl font-bold tracking-tight">{displayAmount}</span>
            <span className="text-lg text-muted-foreground ml-2">{tokenSymbol}</span>
            <p className="text-sm text-muted-foreground mt-1">per {intervalDisplay}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                {plan.subscriberCount} subscriber{plan.subscriberCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Since {new Date(plan.createdAt * 1000).toLocaleDateString()}</span>
            </div>
          </div>

          {/* CTA */}
          {isConnected ? (
            <Button
              className="w-full bg-primary text-white rounded-xl h-12 text-base"
              onClick={() => setShowSubscribe(true)}
            >
              Subscribe Now
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full bg-primary text-white rounded-xl h-12 text-base"
                onClick={connect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Wallet className="h-5 w-5 mr-2 animate-pulse" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet to Subscribe
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                New to Stellar?{" "}
                <a href="/onboarding" className="text-primary hover:underline">
                  Follow our setup guide
                </a>
              </p>
            </div>
          )}

          {/* Share link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-accent" />
                Link copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy share link
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* How It Works — trust explainer based on user feedback */}
      <Card className="rounded-2xl border-border/50">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How It Works
          </h2>
          <div className="space-y-3">
            {[
              {
                icon: Shield,
                title: "You set a spending cap",
                desc: "You choose the maximum amount the contract can charge per cycle. Even if the plan price changes, your cap is enforced on-chain.",
              },
              {
                icon: Wallet,
                title: "Funds stay in your wallet",
                desc: "No deposits, no escrow. Your tokens remain in your wallet until the exact moment a payment executes.",
              },
              {
                icon: Clock,
                title: "Cancel instantly, anytime",
                desc: "One click to cancel. No lock-in periods, no pending cancellations. Takes effect immediately.",
              },
            ].map((step) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trust signals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: "Self-Custodial", desc: "Your keys, your funds" },
          { icon: Zap, label: "Sub-Cent Fees", desc: "< $0.01 per tx" },
          { icon: Clock, label: "Cancel Anytime", desc: "Instant, one click" },
        ].map((item) => (
          <div
            key={item.label}
            className="text-center p-3 rounded-xl bg-card border border-border/50"
          >
            <item.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
            <p className="text-xs font-medium">{item.label}</p>
            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
