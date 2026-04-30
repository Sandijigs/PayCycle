"use client";

import { useContractEvents, type ContractEvent, type EventType } from "@/hooks/useContractEvents";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";
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
  plan_created:           { icon: FileText,       label: "Plan Created",     color: "text-blue-500" },
  subscribed:             { icon: UserPlus,       label: "New Subscription", color: "text-green-500" },
  payment_executed:       { icon: CreditCard,     label: "Payment",          color: "text-primary" },
  subscription_cancelled: { icon: XCircle,        label: "Cancelled",        color: "text-destructive" },
  subscription_paused:    { icon: Pause,          label: "Paused",           color: "text-amber-500" },
  subscription_resumed:   { icon: Play,           label: "Resumed",          color: "text-green-500" },
  plc_mint:               { icon: Coins,          label: "PLC Minted",       color: "text-violet-500" },
  plc_transfer:           { icon: ArrowRightLeft, label: "PLC Transfer",     color: "text-cyan-500" },
};

export default function ActivityFeed() {
  const { events, isLoading, error } = useContractEvents();

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Activity</span>
        {!isLoading && events.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{events.length}</span>
        )}
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground text-center py-4">Unable to load events</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 12).map((event) => {
              const config = EVENT_CONFIG[event.type];
              const Icon = config.icon;
              return (
                <div key={event.id} className="flex items-center gap-2.5 py-1.5">
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.color}`} />
                  <span className="text-xs text-foreground flex-1 truncate">{config.label}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(event.timestamp)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
