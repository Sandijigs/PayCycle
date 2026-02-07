// TODO: Orange Belt — Active subscription card
// Shows: plan name, amount, next payment, status, pause/cancel buttons
"use client";
export default function SubscriptionCard({ subscription }: { subscription: any }) {
  return (
    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
      <h3 className="font-semibold">Subscription</h3>
      <p className="text-slate-500">Status: Active</p>
    </div>
  );
}
