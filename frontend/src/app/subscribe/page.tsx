"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useUserSubscriptions, useAllActivePlans } from "@/hooks/useContractQueries";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";
import PlanCard from "@/components/subscription/PlanCard";
import SubscribeFlow from "@/components/subscription/SubscribeFlow";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Wallet, Grid3x3, List } from "lucide-react";
import type { PlanData } from "@/types/subscription";

function ContentCardSkeleton() {
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

export default function SubscribePage() {
  const { address, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<"my" | "browse">("my");
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);

  const {
    data: mySubscriptions,
    isLoading: isLoadingSubscriptions,
    error: subscriptionsError,
    refetch: refetchSubscriptions,
  } = useUserSubscriptions(activeTab === "my" ? address : null);

  const {
    data: allPlans,
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
  } = useAllActivePlans();

  // Wallet not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-6">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Subscriptions</h1>
        <p className="text-muted-foreground max-w-md">
          Connect your wallet to manage your subscriptions and discover new plans.
        </p>
      </div>
    );
  }

  // Subscribe flow overlay
  if (selectedPlan) {
    return (
      <div className="space-y-6">
        <SubscribeFlow
          plan={selectedPlan}
          onSuccess={() => {
            setSelectedPlan(null);
            setActiveTab("my");
            refetchSubscriptions();
          }}
          onCancel={() => setSelectedPlan(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
          <Grid3x3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscriptions and discover new plans
          </p>
        </div>
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-4 sm:gap-8">
          <button
            onClick={() => setActiveTab("my")}
            className={`pb-3 px-1 transition-all relative ${
              activeTab === "my"
                ? "border-b-2 border-primary gradient-text font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              My Subscriptions
            </div>
          </button>
          <button
            onClick={() => setActiveTab("browse")}
            className={`pb-3 px-1 transition-all relative ${
              activeTab === "browse"
                ? "border-b-2 border-primary gradient-text font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Browse Plans
            </div>
          </button>
        </div>
      </div>

      {/* My Subscriptions Tab */}
      {activeTab === "my" && (
        <>
          {/* Loading state */}
          {isLoadingSubscriptions && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ContentCardSkeleton />
              <ContentCardSkeleton />
              <ContentCardSkeleton />
            </div>
          )}

          {/* Error state */}
          {subscriptionsError && !isLoadingSubscriptions && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load subscriptions</p>
              <p className="text-sm text-muted-foreground mb-4">{subscriptionsError.message}</p>
              <Button variant="outline" onClick={() => refetchSubscriptions()}>
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingSubscriptions && !subscriptionsError && mySubscriptions && mySubscriptions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-6">
                <List className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No subscriptions yet</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Browse available plans and subscribe to start receiving recurring services.
              </p>
              <Button
                onClick={() => setActiveTab("browse")}
                className="gradient-brand text-white rounded-xl"
              >
                Browse Plans
              </Button>
            </div>
          )}

          {/* Subscriptions list */}
          {!isLoadingSubscriptions && !subscriptionsError && mySubscriptions && mySubscriptions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mySubscriptions.map(({ subscription, plan }) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  plan={plan}
                  onActionComplete={() => refetchSubscriptions()}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Browse Plans Tab */}
      {activeTab === "browse" && (
        <>
          {/* Loading state */}
          {isLoadingPlans && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ContentCardSkeleton />
              <ContentCardSkeleton />
              <ContentCardSkeleton />
            </div>
          )}

          {/* Error state */}
          {plansError && !isLoadingPlans && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load plans</p>
              <p className="text-sm text-muted-foreground mb-4">{plansError.message}</p>
              <Button variant="outline" onClick={() => refetchPlans()}>
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingPlans && !plansError && allPlans && allPlans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-6">
                <Grid3x3 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No plans available</h2>
              <p className="text-muted-foreground max-w-md">
                There are no active subscription plans available at this time.
              </p>
            </div>
          )}

          {/* Plans grid */}
          {!isLoadingPlans && !plansError && allPlans && allPlans.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allPlans.map((plan) => (
                <div key={plan.id} onClick={() => setSelectedPlan(plan)} className="cursor-pointer">
                  <PlanCard plan={plan} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
