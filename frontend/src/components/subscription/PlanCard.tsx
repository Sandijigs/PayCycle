"use client";

import { PlanData } from "@/types/subscription";
import { resolveToken, formatAmount, formatInterval } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface PlanCardProps {
  plan: PlanData;
  onClick?: () => void;
}

export default function PlanCard({ plan, onClick }: PlanCardProps) {
  const { symbol, decimals } = resolveToken(plan.token);
  const displayAmount = formatAmount(plan.amount, decimals);
  const interval = formatInterval(plan.interval);

  return (
    <Card
      className="rounded-xl border-border hover:border-primary/20 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{plan.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plan.subscriberCount} subscriber{plan.subscriberCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge
            variant={plan.status === "Active" ? "default" : plan.status === "Paused" ? "secondary" : "destructive"}
            className="text-[10px]"
          >
            {plan.status}
          </Badge>
        </div>

        <div>
          <span className="text-2xl font-bold tracking-tight">{displayAmount}</span>
          <span className="text-sm text-muted-foreground ml-1">{symbol}</span>
          <span className="text-xs text-muted-foreground"> / {interval}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            Created {new Date(plan.createdAt * 1000).toLocaleDateString()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(`${window.location.origin}/plan/${plan.id}`);
              toast.success("Plan link copied!");
            }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          >
            <Share2 className="h-3 w-3" />
            Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
