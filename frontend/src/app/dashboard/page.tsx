"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useMerchantPlans, useUserSubscriptions } from "@/hooks/useContractQueries";
import { resolveToken } from "@/lib/utils";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";
import PlanCard from "@/components/subscription/PlanCard";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityFeed from "@/components/ActivityFeed";

type RoleTab = "merchant" | "subscriber";

const SECONDS_PER_MONTH = 2_592_000;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold tracking-tight truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

function MerchantTab({ address, plcBalance }: { address: string; plcBalance: string | null }) {
  const { data: plans, isLoading, error } = useMerchantPlans(address);

  if (isLoading) return <StatsSkeleton />;
  if (error) return <p className="text-sm text-destructive py-8 text-center">Failed to load data</p>;

  const activePlans = plans?.filter((p) => p.status === "Active") || [];
  const totalSubs = plans?.reduce((sum, p) => sum + p.subscriberCount, 0) || 0;
  const mrr = activePlans.reduce((sum, p) => {
    const { decimals } = resolveToken(p.token);
    const perMonth = (Number(p.amount) / 10 ** decimals) * (SECONDS_PER_MONTH / p.interval);
    return sum + perMonth * p.subscriberCount;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Plans" value={String(plans?.length || 0)} sub={`${activePlans.length} active`} />
        <StatCard label="Subscribers" value={String(totalSubs)} />
        <StatCard label="Monthly Revenue" value={`${mrr.toFixed(2)} XLM`} />
        <StatCard label="PLC Earned" value={plcBalance ? `${parseFloat(plcBalance).toLocaleString()}` : "0"} />
      </div>

      {plans && plans.length > 0 ? (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your Plans</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No plans yet</p>
      )}
    </div>
  );
}

function SubscriberTab({ address, plcBalance }: { address: string; plcBalance: string | null }) {
  const { data: enrichedSubs, isLoading, error, refetch } = useUserSubscriptions(address);

  if (isLoading) return <StatsSkeleton />;
  if (error) return <p className="text-sm text-destructive py-8 text-center">Failed to load data</p>;

  const subs = enrichedSubs || [];
  const activeSubs = subs.filter((s) => s.subscription.status === "Active");
  const now = Math.floor(Date.now() / 1000);
  const nextPayment = activeSubs
    .map((s) => s.subscription.nextPayment)
    .filter((t) => t > now)
    .sort((a, b) => a - b)[0];

  const spending = activeSubs.reduce((sum, { plan }) => {
    const { decimals } = resolveToken(plan.token);
    return sum + (Number(plan.amount) / 10 ** decimals) * (SECONDS_PER_MONTH / plan.interval);
  }, 0);

  const nextPaymentLabel = !nextPayment ? "None" : (() => {
    const days = Math.ceil((nextPayment - now) / 86400);
    return days <= 0 ? "Overdue" : days === 1 ? "Tomorrow" : `In ${days} days`;
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active" value={String(activeSubs.length)} sub={`${subs.length} total`} />
        <StatCard label="Next Payment" value={nextPaymentLabel} />
        <StatCard label="Monthly Spend" value={`${spending.toFixed(2)} XLM`} />
        <StatCard label="PLC Earned" value={plcBalance ? `${parseFloat(plcBalance).toLocaleString()}` : "0"} />
      </div>

      {subs.length > 0 ? (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your Subscriptions</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subs.map(({ subscription, plan }) => (
              <SubscriptionCard key={subscription.id} subscription={subscription} plan={plan} onActionComplete={() => refetch()} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const { plc: plcBalance } = useBalance(address);
  const [activeTab, setActiveTab] = useState<RoleTab>("merchant");

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-semibold mb-2">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Connect your wallet to view your activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <a
          href="https://forms.gle/EEbHGKuBsodKgPhz7"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Give Feedback
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-6">
        {(["merchant", "subscriber"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-sm transition-colors ${
              activeTab === tab
                ? "border-b-2 border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "merchant" ? "Merchant" : "Subscriber"}
          </button>
        ))}
      </div>

      {/* Content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {activeTab === "merchant" && <MerchantTab address={address!} plcBalance={plcBalance} />}
          {activeTab === "subscriber" && <SubscriberTab address={address!} plcBalance={plcBalance} />}
        </div>
        <div className="order-first lg:order-last">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
