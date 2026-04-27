"use client";

import { PlanData, INTERVAL_LABELS, INTERVALS, type IntervalKey } from "@/types/subscription";
import { TOKENS } from "@/lib/contracts";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, ArrowRight } from "lucide-react";

interface PlanCardProps {
  plan: PlanData;
  onClick?: () => void;
}

export default function PlanCard({ plan, onClick }: PlanCardProps) {
  // Resolve token symbol from address
  const tokenInfo = Object.values(TOKENS).find(
    (t) => t.address === plan.token
  );
  const tokenSymbol = tokenInfo?.symbol || "TOKEN";
  const decimals = tokenInfo?.decimals || 7;

  // Convert amount from stroops to human-readable
  const displayAmount = (Number(plan.amount) / 10 ** decimals).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  // Resolve interval label
  const intervalLabel = Object.entries(INTERVALS).find(
    ([, seconds]) => seconds === plan.interval
  )?.[0] as IntervalKey | undefined;
  const intervalDisplay = intervalLabel
    ? INTERVAL_LABELS[intervalLabel].toLowerCase()
    : `${Math.round(plan.interval / 3600)}h`;

  // Status badge color
  const statusVariant = plan.status === "Active"
    ? "default"
    : plan.status === "Paused"
    ? "secondary"
    : "destructive";

  return (
    <Card
      className="rounded-2xl border-border/50 hover:border-primary/20 hover:glow-primary transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg group-hover:gradient-text transition-all">
            {plan.name}
          </CardTitle>
          <Badge variant={statusVariant}>{plan.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {displayAmount}
          </span>
          <span className="text-muted-foreground ml-1">
            {tokenSymbol}
          </span>
          <span className="text-muted-foreground text-sm">
            {" "}/ {intervalDisplay}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {plan.subscriberCount} subscriber{plan.subscriberCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>
              Created {new Date(plan.createdAt * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View details
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </CardFooter>
    </Card>
  );
}
