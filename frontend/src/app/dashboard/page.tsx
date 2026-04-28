"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useMerchantPlans, useUserSubscriptions } from "@/hooks/useContractQueries";
import { TOKENS } from "@/lib/contracts";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";
import PlanCard from "@/components/subscription/PlanCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityFeed from "@/components/ActivityFeed";
import { Wallet, LayoutDashboard, Store, User, TrendingUp, Users, FileText, Clock, DollarSign, Coins, MessageSquare } from "lucide-react";

type RoleTab = "merchant" | "subscriber";

// ---- Helpers ----

function resolveToken(tokenAddress: string) {
  const info = Object.values(TOKENS).find((t) => t.address === tokenAddress);
  return { symbol: info?.symbol || "TOKEN", decimals: info?.decimals || 7 };
}

// ---- Skeleton components ----

function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="pt-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function ContentCardSkeleton() {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Stat card ----

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="p-4 sm:pt-6 sm:px-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg gradient-brand-subtle flex items-center justify-center flex-shrink-0">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground truncate">{label}</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold tracking-tight truncate">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Merchant Tab ----

function MerchantTab({ address, plcBalance }: { address: string; plcBalance: string | null }) {
  const { data: plans, isLoading, error } = useMerchantPlans(address);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCardSkeleton />
          <ContentCardSkeleton />
          <ContentCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive font-medium">Failed to load merchant data</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  const activePlans = plans?.filter((p) => p.status === "Active") || [];
  const totalSubscribers = plans?.reduce((sum, p) => sum + p.subscriberCount, 0) || 0;

  // Calculate MRR: amount per month * subscriber count for each active plan
  const monthlyRevenue = activePlans.reduce((sum, p) => {
    const { decimals } = resolveToken(p.token);
    const amountPerInterval = Number(p.amount) / 10 ** decimals;
    const intervalsPerMonth = 2_592_000 / p.interval;
    return sum + amountPerInterval * intervalsPerMonth * p.subscriberCount;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Plans"
          value={String(plans?.length || 0)}
          subtitle={`${activePlans.length} active`}
        />
        <StatCard
          icon={Users}
          label="Total Subscribers"
          value={String(totalSubscribers)}
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={`${monthlyRevenue.toFixed(2)} XLM`}
          subtitle="Estimated MRR"
        />
        <StatCard
          icon={Coins}
          label="PLC Earned"
          value={plcBalance ? `${parseFloat(plcBalance).toLocaleString()} PLC` : "0 PLC"}
          subtitle="Reward tokens from payments"
        />
      </div>

      {plans && plans.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Your Plans
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No plans created yet. Go to My Plans to create one.</p>
        </div>
      )}
    </div>
  );
}

// ---- Subscriber Tab ----

function SubscriberTab({ address, plcBalance }: { address: string; plcBalance: string | null }) {
  const { data: enrichedSubs, isLoading, error, refetch } = useUserSubscriptions(address);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCardSkeleton />
          <ContentCardSkeleton />
          <ContentCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive font-medium">Failed to load subscriptions</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  const subs = enrichedSubs || [];
  const activeSubs = subs.filter((s) => s.subscription.status === "Active");

  // Next payment: soonest upcoming from active subs
  const now = Math.floor(Date.now() / 1000);
  const upcomingPayments = activeSubs
    .map((s) => s.subscription.nextPayment)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);
  const nextPaymentTimestamp = upcomingPayments[0];

  const formatNextPayment = () => {
    if (!nextPaymentTimestamp) return "None";
    const diff = nextPaymentTimestamp - now;
    if (diff <= 0) return "Overdue";
    const days = Math.ceil(diff / 86400);
    if (days === 0) return "Today";
    return `In ${days} day${days !== 1 ? "s" : ""}`;
  };

  // Monthly spending: sum of active plan amounts normalized to monthly
  const monthlySpending = activeSubs.reduce((sum, { plan }) => {
    const { decimals } = resolveToken(plan.token);
    const amountPerInterval = Number(plan.amount) / 10 ** decimals;
    const intervalsPerMonth = 2_592_000 / plan.interval;
    return sum + amountPerInterval * intervalsPerMonth;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Active Subscriptions"
          value={String(activeSubs.length)}
          subtitle={`${subs.length} total`}
        />
        <StatCard
          icon={Clock}
          label="Next Payment"
          value={formatNextPayment()}
          subtitle={nextPaymentTimestamp ? new Date(nextPaymentTimestamp * 1000).toLocaleDateString() : undefined}
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Spending"
          value={`${monthlySpending.toFixed(2)} XLM`}
          subtitle="Estimated"
        />
        <StatCard
          icon={Coins}
          label="PLC Earned"
          value={plcBalance ? `${parseFloat(plcBalance).toLocaleString()} PLC` : "0 PLC"}
          subtitle="Reward tokens from payments"
        />
      </div>

      {subs.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Your Subscriptions
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subs.map(({ subscription, plan }) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                plan={plan}
                onActionComplete={() => refetch()}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No subscriptions yet. Browse plans to subscribe.</p>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const { plc: plcBalance } = useBalance(address);
  const [activeTab, setActiveTab] = useState<RoleTab>("merchant");

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mb-6">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground max-w-md">
          Connect your wallet to view your merchant and subscriber dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your PayCycle activity
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-4 sm:gap-8">
          <button
            onClick={() => setActiveTab("merchant")}
            className={`pb-3 px-1 transition-all relative ${
              activeTab === "merchant"
                ? "border-b-2 border-primary gradient-text font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              As Merchant
            </div>
          </button>
          <button
            onClick={() => setActiveTab("subscriber")}
            className={`pb-3 px-1 transition-all relative ${
              activeTab === "subscriber"
                ? "border-b-2 border-primary gradient-text font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              As Subscriber
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content + Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {activeTab === "merchant" && <MerchantTab address={address!} plcBalance={plcBalance} />}
          {activeTab === "subscriber" && <SubscriberTab address={address!} plcBalance={plcBalance} />}
        </div>
        <div className="order-first lg:order-last space-y-4">
          <ActivityFeed />
          {/* Feedback CTA */}
          <Card className="rounded-2xl border-primary/20 gradient-brand-subtle">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Help us improve</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                    Share your experience — takes under 2 minutes.
                  </p>
                  <a
                    href="https://forms.gle/EEbHGKuBsodKgPhz7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Give Feedback
                    <span aria-hidden>&rarr;</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
