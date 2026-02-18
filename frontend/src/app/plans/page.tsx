"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useSubscription } from "@/hooks/useSubscription";
import type { PlanData } from "@/types/subscription";
import CreatePlanForm from "@/components/subscription/CreatePlanForm";
import PlanCard from "@/components/subscription/PlanCard";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Wallet, LayoutGrid } from "lucide-react";

export default function PlansPage() {
  const { address, isConnected } = useWallet();
  const { getMerchantPlans } = useSubscription();

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch merchant plans when wallet connects
  const fetchPlans = async () => {
    if (!address) return;
    setIsLoadingPlans(true);
    setLoadError(null);
    try {
      const result = await getMerchantPlans(address);
      setPlans(result);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchPlans();
    } else {
      setPlans([]);
    }
  }, [address]);

  const handlePlanCreated = (planId: number) => {
    setShowCreateForm(false);
    // Refetch plans to include the new one
    fetchPlans();
  };

  // ---------- RENDER ----------

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-6">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">My Subscription Plans</h1>
        <p className="text-muted-foreground max-w-md">
          Connect your wallet to view and manage your subscription plans.
        </p>
      </div>
    );
  }

  // Create form overlay
  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">New Plan</h1>
            <p className="text-sm text-muted-foreground">
              Create a recurring payment plan for your subscribers
            </p>
          </div>
        </div>
        <CreatePlanForm
          onSuccess={handlePlanCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Subscription Plans</h1>
            <p className="text-sm text-muted-foreground">
              Manage your recurring payment plans
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="gradient-brand text-white rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {/* Loading state */}
      {isLoadingPlans && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your plans...</p>
        </div>
      )}

      {/* Error state */}
      {loadError && !isLoadingPlans && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-destructive font-medium mb-2">Failed to load plans</p>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Button variant="outline" onClick={fetchPlans}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoadingPlans && !loadError && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-6">
            <LayoutGrid className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No plans yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Create your first subscription plan to start accepting recurring payments on Stellar.
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="gradient-brand text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Plan
          </Button>
        </div>
      )}

      {/* Plan grid */}
      {!isLoadingPlans && !loadError && plans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onClick={() => {
                // Future: navigate to plan detail or expand inline
                console.log("Plan clicked:", plan.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
