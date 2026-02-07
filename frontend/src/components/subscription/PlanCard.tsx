// TODO: Orange Belt — Subscription plan card component
// Displays: plan name, amount, interval, subscriber count, status badge
"use client";
export default function PlanCard({ plan }: { plan: any }) {
  return (
    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
      <h3 className="font-semibold">{plan?.name || "Plan"}</h3>
      <p className="text-slate-500">Amount / interval</p>
    </div>
  );
}
