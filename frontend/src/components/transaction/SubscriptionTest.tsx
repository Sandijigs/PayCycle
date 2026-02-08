"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import TxStatus from "./TxStatus";
import { Loader2, FileText, UserCheck, CreditCard, XCircle, Pause, Play } from "lucide-react";

// Native XLM SAC address on testnet
const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export default function SubscriptionTest() {
  const {
    createPlan,
    subscribe,
    executePayment,
    cancel,
    pause,
    resume,
    isLoading,
    error,
    txStatus,
    txHash,
    resetStatus,
  } = useSubscription();

  const [planId, setPlanId] = useState<number | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Input fields for manual IDs
  const [planIdInput, setPlanIdInput] = useState("");
  const [subIdInput, setSubIdInput] = useState("");

  const handleCreatePlan = async () => {
    resetStatus();
    setResult(null);
    try {
      const id = await createPlan({
        token: XLM_SAC,
        amount: BigInt(10_0000000), // 10 XLM (7 decimals)
        interval: 3600, // 1 hour
        name: "Test Plan (10 XLM/hr)",
      });
      setPlanId(id);
      setResult(`Plan created with ID: ${id}`);
    } catch {
      // error already in hook state
    }
  };

  const handleSubscribe = async () => {
    const id = planIdInput ? parseInt(planIdInput) : planId;
    if (!id) return;
    resetStatus();
    setResult(null);
    try {
      const sId = await subscribe(id, BigInt(15_0000000)); // max 15 XLM
      setSubId(sId);
      setResult(`Subscribed! Subscription ID: ${sId}`);
    } catch {
      // error already in hook state
    }
  };

  const handleExecutePayment = async () => {
    const id = subIdInput ? parseInt(subIdInput) : subId;
    if (!id) return;
    resetStatus();
    setResult(null);
    try {
      const success = await executePayment(id);
      setResult(success ? "Payment executed successfully!" : "Payment returned false");
    } catch {
      // error already in hook state
    }
  };

  const handleCancel = async () => {
    const id = subIdInput ? parseInt(subIdInput) : subId;
    if (!id) return;
    resetStatus();
    setResult(null);
    try {
      await cancel(id);
      setResult("Subscription cancelled");
    } catch {
      // error already in hook state
    }
  };

  const handlePause = async () => {
    const id = subIdInput ? parseInt(subIdInput) : subId;
    if (!id) return;
    resetStatus();
    setResult(null);
    try {
      await pause(id);
      setResult("Subscription paused");
    } catch {
      // error already in hook state
    }
  };

  const handleResume = async () => {
    const id = subIdInput ? parseInt(subIdInput) : subId;
    if (!id) return;
    resetStatus();
    setResult(null);
    try {
      await resume(id);
      setResult("Subscription resumed");
    } catch {
      // error already in hook state
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Subscription Contract</h3>
          <p className="text-xs text-muted-foreground">Test Soroban smart contract on Testnet</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Create Plan */}
        <button
          onClick={handleCreatePlan}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Create Test Plan (10 XLM / 1hr)
        </button>

        {/* Plan ID input */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Plan ID
          </label>
          <input
            type="number"
            placeholder={planId ? String(planId) : "Enter plan ID"}
            value={planIdInput}
            onChange={(e) => setPlanIdInput(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-50"
          />
        </div>

        {/* Subscribe */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading || (!planId && !planIdInput)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
          Subscribe (max 15 XLM)
        </button>

        {/* Subscription ID input */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Subscription ID
          </label>
          <input
            type="number"
            placeholder={subId ? String(subId) : "Enter subscription ID"}
            value={subIdInput}
            onChange={(e) => setSubIdInput(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-50"
          />
        </div>

        {/* Payment + Lifecycle buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExecutePayment}
            disabled={isLoading || (!subId && !subIdInput)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <CreditCard className="h-4 w-4" />
            Pay
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading || (!subId && !subIdInput)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handlePause}
            disabled={isLoading || (!subId && !subIdInput)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            onClick={handleResume}
            disabled={isLoading || (!subId && !subIdInput)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            Resume
          </button>
        </div>

        {/* Result display */}
        {result && (
          <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-medium text-green-600">{result}</p>
          </div>
        )}

        {/* Transaction status */}
        <TxStatus status={txStatus} txHash={txHash} errorMessage={error || undefined} />
      </div>
    </div>
  );
}
