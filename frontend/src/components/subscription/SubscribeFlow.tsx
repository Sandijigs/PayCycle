"use client";

import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import type { PlanData } from "@/types/subscription";
import { TOKENS } from "@/lib/contracts";
import { INTERVAL_LABELS, INTERVALS, type IntervalKey } from "@/types/subscription";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TxStatus from "@/components/transaction/TxStatus";
import { Loader2, ArrowLeft, Check, Info } from "lucide-react";

interface SubscribeFlowProps {
  plan: PlanData;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SubscribeFlow({ plan, onSuccess, onCancel }: SubscribeFlowProps) {
  const [step, setStep] = useState(1);
  const [maxAmount, setMaxAmount] = useState("");

  const { subscribe, isLoading: isSubscribing, txStatus: subscribeStatus, txHash: subscribeHash, error: subscribeError } = useSubscription();
  const { approveToken, isApproving, approvalStatus, approvalHash, error: approvalError } = useTokenApproval();

  // Resolve token info
  const tokenInfo = Object.values(TOKENS).find((t) => t.address === plan.token);
  const tokenSymbol = tokenInfo?.symbol || "TOKEN";
  const decimals = tokenInfo?.decimals || 7;

  // Format plan amount
  const planAmountDisplay = (Number(plan.amount) / 10 ** decimals).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Resolve interval label
  const intervalLabel = Object.entries(INTERVALS).find(
    ([, seconds]) => seconds === plan.interval
  )?.[0] as IntervalKey | undefined;
  const intervalDisplay = intervalLabel
    ? INTERVAL_LABELS[intervalLabel].toLowerCase()
    : `${Math.round(plan.interval / 3600)}h`;

  // Default max amount: plan amount * 12 (yearly buffer)
  useEffect(() => {
    if (!maxAmount) {
      const defaultMax = Number(plan.amount) / 10 ** decimals * 12;
      setMaxAmount(defaultMax.toFixed(2));
    }
  }, [plan.amount, decimals, maxAmount]);

  const handleApprove = async () => {
    try {
      const maxAmountValue = parseFloat(maxAmount);
      if (isNaN(maxAmountValue) || maxAmountValue <= 0) {
        return;
      }

      const maxAmountStroops = BigInt(Math.round(maxAmountValue * 10 ** decimals));

      // Get current ledger for expiry
      const expiryLedger = 1_000_000; // Generous expiry

      // Get contract ID from env
      const contractId = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ID || "";

      await approveToken(plan.token, contractId, maxAmountStroops, expiryLedger);

      // Auto-advance to step 3 on success
      setStep(3);
    } catch {
      // Error already surfaced via hook state
    }
  };

  const handleSubscribe = async () => {
    try {
      const maxAmountValue = parseFloat(maxAmount);
      if (isNaN(maxAmountValue) || maxAmountValue <= 0) {
        return;
      }

      const maxAmountStroops = BigInt(Math.round(maxAmountValue * 10 ** decimals));

      await subscribe(plan.id, maxAmountStroops);

      // Wait a moment for success state to show
      setTimeout(() => onSuccess(), 2000);
    } catch {
      // Error already surfaced via hook state
    }
  };

  const isLoading = isApproving || isSubscribing;

  return (
    <Card className="rounded-2xl border-border/50 max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Subscribe to {plan.name}</CardTitle>
          <Badge variant="secondary">Step {step}/3</Badge>
        </div>
        <CardDescription>
          {step === 1 && "Set your spending limit"}
          {step === 2 && "Approve token spending"}
          {step === 3 && "Confirm subscription"}
        </CardDescription>

        {/* Progress bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* STEP 1: Set spending cap */}
        {step === 1 && (
          <>
            <div className="p-4 rounded-xl bg-background border border-border/50">
              <h3 className="font-semibold mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold">
                {planAmountDisplay} <span className="text-lg text-muted-foreground">{tokenSymbol}</span>
              </p>
              <p className="text-sm text-muted-foreground">per {intervalDisplay}</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-500 mb-1">About spending caps</p>
                  <p className="text-muted-foreground">
                    You&apos;ll approve the contract to debit up to this amount per payment cycle. This protects you if the plan price changes.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Maximum Amount per Payment
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="rounded-xl pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {tokenSymbol}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: {(Number(plan.amount) / 10 ** decimals * 12).toFixed(2)} {tokenSymbol} (1 year buffer)
              </p>
            </div>
          </>
        )}

        {/* STEP 2: Approve tokens */}
        {step === 2 && (
          <>
            <div className="space-y-3 p-4 rounded-xl bg-background border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">
                  {planAmountDisplay} {tokenSymbol} / {intervalDisplay}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Spending Cap</span>
                <span className="font-semibold">
                  {parseFloat(maxAmount).toFixed(2)} {tokenSymbol}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-500 mb-1">Wallet approval required</p>
                  <p className="text-muted-foreground">
                    You&apos;ll be asked to approve the subscription contract to spend your tokens. This is a standard Stellar token approval.
                  </p>
                </div>
              </div>
            </div>

            <TxStatus
              status={approvalStatus}
              txHash={approvalHash || undefined}
              errorMessage={approvalError || undefined}
            />
          </>
        )}

        {/* STEP 3: Subscribe */}
        {step === 3 && (
          <>
            <div className="space-y-3 p-4 rounded-xl bg-background border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">
                  {planAmountDisplay} {tokenSymbol} / {intervalDisplay}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Spending Cap</span>
                <span className="font-semibold">
                  {parseFloat(maxAmount).toFixed(2)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              </div>
            </div>

            <TxStatus
              status={subscribeStatus}
              txHash={subscribeHash || undefined}
              errorMessage={subscribeError || undefined}
            />
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step === 1 ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        {step === 1 && (
          <Button
            onClick={() => setStep(2)}
            disabled={!maxAmount || parseFloat(maxAmount) <= 0}
            className="bg-primary text-white"
          >
            Continue
          </Button>
        )}

        {step === 2 && (
          <Button
            onClick={handleApprove}
            disabled={isApproving || approvalStatus === "success"}
            className="bg-primary text-white"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {approvalStatus === "signing" ? "Signing..." : "Submitting..."}
              </>
            ) : approvalStatus === "success" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Approved!
              </>
            ) : (
              "Approve Spending"
            )}
          </Button>
        )}

        {step === 3 && (
          <Button
            onClick={handleSubscribe}
            disabled={isSubscribing || subscribeStatus === "success"}
            className="bg-primary text-white"
          >
            {isSubscribing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {subscribeStatus === "signing" ? "Signing..." : "Submitting..."}
              </>
            ) : subscribeStatus === "success" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Subscribed!
              </>
            ) : (
              "Confirm Subscription"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
