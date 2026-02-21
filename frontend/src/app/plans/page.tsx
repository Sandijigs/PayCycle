"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useMerchantPlans } from "@/hooks/useContractQueries";
import CreatePlanForm from "@/components/subscription/CreatePlanForm";
import PlanCard from "@/components/subscription/PlanCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, LayoutGrid } from "lucide-react";

function PlanCardSkeleton() {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-9 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlansPage() {
  const { address, isConnected } = useWallet();
  const { data: plans, isLoading, error, refetch } = useMerchantPlans(address);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handlePlanCreated = () => {
    setShowCreateForm(false);
    refetch();
  };

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

      {/* Loading state - skeleton cards */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlanCardSkeleton />
          <PlanCardSkeleton />
          <PlanCardSkeleton />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-destructive font-medium mb-2">Failed to load plans</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && plans && plans.length === 0 && (
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
      {!isLoading && !error && plans && plans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
