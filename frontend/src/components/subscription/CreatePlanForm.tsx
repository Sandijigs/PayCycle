"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { TOKENS, type TokenSymbol } from "@/lib/contracts";
import { INTERVALS, INTERVAL_LABELS, type IntervalKey, type CreatePlanParams } from "@/types/subscription";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import TxStatus from "@/components/transaction/TxStatus";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";

interface CreatePlanFormProps {
  onSuccess: (planId: number) => void;
  onCancel: () => void;
}

export default function CreatePlanForm({ onSuccess, onCancel }: CreatePlanFormProps) {
  // Wizard step (1, 2, 3)
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 fields
  const [tokenSymbol, setTokenSymbol] = useState<TokenSymbol>("XLM");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<IntervalKey>("monthly");

  // Hook
  const { createPlan, isLoading, txStatus, txHash, error, resetTx } = useSubscription();

  // Validation
  const step1Valid = name.trim().length > 0;
  const step2Valid = parseFloat(amount) > 0;

  const handleSubmit = async () => {
    const token = TOKENS[tokenSymbol];
    if (!token.address) return;

    const decimals = token.decimals; // 7 for Stellar
    const amountInStroops = BigInt(
      Math.round(parseFloat(amount) * 10 ** decimals)
    );

    const params: CreatePlanParams = {
      name: name.trim(),
      description: description.trim(),
      token: token.address,
      amount: amountInStroops,
      interval: INTERVALS[interval],
    };

    try {
      const planId = await createPlan(params);
      // Wait a moment for the success state to show, then callback
      setTimeout(() => onSuccess(planId), 2000);
    } catch {
      // Error is already set in the hook state
    }
  };

  const formatAmount = () => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Card className="rounded-2xl border-border/50 max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Create Subscription Plan</CardTitle>
          <Badge variant="secondary">Step {step}/3</Badge>
        </div>
        <CardDescription>
          {step === 1 && "Set up your plan details"}
          {step === 2 && "Configure pricing and billing cycle"}
          {step === 3 && "Review and create your plan"}
        </CardDescription>

        {/* Progress bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "gradient-brand" : "bg-border"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* STEP 1: Name + Description */}
        {step === 1 && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Plan Name *
              </label>
              <Input
                placeholder="e.g. Pro Monthly"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Description (optional)
              </label>
              <Input
                placeholder="What subscribers get..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </>
        )}

        {/* STEP 2: Token + Amount + Interval */}
        {step === 2 && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Payment Token
              </label>
              <Select
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value as TokenSymbol)}
                className="rounded-xl"
              >
                <option value="XLM">XLM (Stellar Lumens)</option>
                {TOKENS.USDC.address && (
                  <option value="USDC">USDC (USD Coin)</option>
                )}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Amount per billing cycle
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="rounded-xl pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {tokenSymbol}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Billing Interval
              </label>
              <Select
                value={interval}
                onChange={(e) => setInterval(e.target.value as IntervalKey)}
                className="rounded-xl"
              >
                {(Object.keys(INTERVALS) as IntervalKey[]).map((key) => (
                  <option key={key} value={key}>
                    {INTERVAL_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {/* STEP 3: Review + Submit */}
        {step === 3 && (
          <>
            <div className="space-y-3 p-4 rounded-xl bg-background border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan Name</span>
                <span className="font-semibold">{name}</span>
              </div>
              {description && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <span className="text-right max-w-[200px] truncate">{description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">
                  {formatAmount()} {tokenSymbol} / {INTERVAL_LABELS[interval].toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token</span>
                <span>{TOKENS[tokenSymbol].name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Protocol Fee</span>
                <span>0.5%</span>
              </div>
            </div>

            <TxStatus
              status={txStatus}
              txHash={txHash}
              errorMessage={error || undefined}
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
            onClick={() => { setStep(step - 1); resetTx(); }}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !step1Valid : !step2Valid}
            className="gradient-brand text-white"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isLoading || txStatus === "success"}
            className="gradient-brand text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {txStatus === "signing" ? "Signing..." : "Submitting..."}
              </>
            ) : txStatus === "success" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Created!
              </>
            ) : (
              "Create Plan"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
