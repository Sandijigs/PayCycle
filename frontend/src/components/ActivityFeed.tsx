"use client";

import { useContractEvents, type ContractEvent, type EventType } from "@/hooks/useContractEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  UserPlus,
  CreditCard,
  XCircle,
  Pause,
  Play,
  Coins,
  ArrowRightLeft,
  Activity,
} from "lucide-react";

const EVENT_CONFIG: Record<EventType, { icon: React.ElementType; label: string; color: string }> = {
  plan_created:             { icon: FileText,       label: "Plan Created",        color: "text-blue-500 bg-blue-500/10" },
  subscribed:               { icon: UserPlus,       label: "New Subscription",    color: "text-green-500 bg-green-500/10" },
  payment_executed:         { icon: CreditCard,     label: "Payment Executed",    color: "text-primary bg-primary/10" },
  subscription_cancelled:   { icon: XCircle,        label: "Sub Cancelled",       color: "text-destructive bg-destructive/10" },
  subscription_paused:      { icon: Pause,          label: "Sub Paused",          color: "text-amber-500 bg-amber-500/10" },
  subscription_resumed:     { icon: Play,           label: "Sub Resumed",         color: "text-green-500 bg-green-500/10" },
  plc_mint:                 { icon: Coins,          label: "PLC Minted",          color: "text-violet-500 bg-violet-500/10" },
  plc_transfer:             { icon: ArrowRightLeft, label: "PLC Transfer",        color: "text-cyan-500 bg-cyan-500/10" },
};

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function EventRow({ event }: { event: ContractEvent }) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const [iconColor, iconBg] = config.color.split(" ");

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{config.label}</p>
        <p className="text-xs text-muted-foreground">
          Ledger #{event.ledger.toLocaleString()}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {timeAgo(event.timestamp)}
      </span>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function ActivityFeed() {
  const { events, isLoading, error } = useContractEvents();

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-brand-subtle flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Protocol Activity</CardTitle>
          {!isLoading && events.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <FeedSkeleton />
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Unable to load events
          </p>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent protocol activity
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Events will appear here when transactions occur
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.slice(0, 15).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
