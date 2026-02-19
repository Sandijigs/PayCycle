"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useSubscription } from "@/hooks/useSubscription";
import type { PlanData, SubscriptionData } from "@/types/subscription";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";
import PlanCard from "@/components/subscription/PlanCard";
import SubscribeFlow from "@/components/subscription/SubscribeFlow";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Grid3x3, List } from "lucide-react";

export default function SubscribePage() {
  const { address, isConnected } = useWallet();
  const {
    getSubscription,
    getUserSubscriptions,
    getPlan,
    getPlanCount,
  } = useSubscription();

  const [activeTab, setActiveTab] = useState<"my" | "browse">("my");
  const [mySubscriptions, setMySubscriptions] = useState<
    Array<{ subscription: SubscriptionData; plan: PlanData }>
  >([]);
  const [allPlans, setAllPlans] = useState<PlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);

  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);

  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Fetch user subscriptions
  const fetchUserSubscriptions = async () => {
    if (!address) return;

    setIsLoadingSubscriptions(true);
    setSubscriptionsError(null);
    try {
      const subIds = await getUserSubscriptions(address);

      const enrichedSubs = await Promise.all(
        subIds.map(async (id) => {
          const subscription = await getSubscription(id);
          const plan = await getPlan(subscription.planId);
          return { subscription, plan };
        })
      );

      setMySubscriptions(enrichedSubs);
    } catch (err: unknown) {
      setSubscriptionsError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  // Fetch all active plans
  const fetchAllPlans = async () => {
    setIsLoadingPlans(true);
    setPlansError(null);
    try {
      const count = await getPlanCount();
      const plans: PlanData[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const plan = await getPlan(i);
          if (plan.status === "Active") {
            plans.push(plan);
          }
        } catch {
          continue;
        }
      }

      setAllPlans(plans);
    } catch (err: unknown) {
      setPlansError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (!isConnected) {
      setMySubscriptions([]);
      setAllPlans([]);
      return;
    }

    if (activeTab === "my") {
      fetchUserSubscriptions();
    } else if (activeTab === "browse") {
      fetchAllPlans();
    }
  }, [activeTab, isConnected, address]);

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
            fetchUserSubscriptions();
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
        <div className="flex gap-8">
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
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your subscriptions...</p>
            </div>
          )}

          {/* Error state */}
          {subscriptionsError && !isLoadingSubscriptions && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load subscriptions</p>
              <p className="text-sm text-muted-foreground mb-4">{subscriptionsError}</p>
              <Button variant="outline" onClick={fetchUserSubscriptions}>
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingSubscriptions && !subscriptionsError && mySubscriptions.length === 0 && (
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
          {!isLoadingSubscriptions && !subscriptionsError && mySubscriptions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mySubscriptions.map(({ subscription, plan }) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  plan={plan}
                  onActionComplete={fetchUserSubscriptions}
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
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading available plans...</p>
            </div>
          )}

          {/* Error state */}
          {plansError && !isLoadingPlans && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load plans</p>
              <p className="text-sm text-muted-foreground mb-4">{plansError}</p>
              <Button variant="outline" onClick={fetchAllPlans}>
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingPlans && !plansError && allPlans.length === 0 && (
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
          {!isLoadingPlans && !plansError && allPlans.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allPlans.map((plan) => (
                <div key={plan.merchant + plan.createdAt} onClick={() => setSelectedPlan(plan)}>
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
