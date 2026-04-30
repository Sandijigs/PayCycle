"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useContractEvents, type ContractEvent, type EventType } from "@/hooks/useContractEvents";
import { useWallet } from "@/hooks/useWallet";
import {
  Bell,
  FileText,
  UserPlus,
  CreditCard,
  XCircle,
  Pause,
  Play,
  Coins,
  ArrowRightLeft,
  CheckCheck,
  Trash2,
} from "lucide-react";

// ─── Event → Notification mapping ────────────────────────

const EVENT_META: Record<EventType, { icon: React.ElementType; color: string; title: string }> = {
  plan_created:           { icon: FileText,       color: "text-blue-500 bg-blue-500/10",        title: "Plan Created" },
  subscribed:             { icon: UserPlus,       color: "text-green-500 bg-green-500/10",       title: "New Subscriber" },
  payment_executed:       { icon: CreditCard,     color: "text-primary bg-primary/10",           title: "Payment Executed" },
  subscription_cancelled: { icon: XCircle,        color: "text-destructive bg-destructive/10",   title: "Subscription Cancelled" },
  subscription_paused:    { icon: Pause,          color: "text-amber-500 bg-amber-500/10",       title: "Subscription Paused" },
  subscription_resumed:   { icon: Play,           color: "text-green-500 bg-green-500/10",       title: "Subscription Resumed" },
  plc_mint:               { icon: Coins,          color: "text-violet-500 bg-violet-500/10",     title: "PLC Rewards Minted" },
  plc_transfer:           { icon: ArrowRightLeft, color: "text-cyan-500 bg-cyan-500/10",         title: "PLC Transfer" },
};

function eventToMessage(type: EventType): string {
  switch (type) {
    case "plan_created":           return "A new subscription plan was created";
    case "subscribed":             return "Someone subscribed to a plan";
    case "payment_executed":       return "A recurring payment was executed successfully";
    case "subscription_cancelled": return "A subscription was cancelled";
    case "subscription_paused":    return "A subscription was paused";
    case "subscription_resumed":   return "A subscription was resumed";
    case "plc_mint":               return "PLC reward tokens were minted";
    case "plc_transfer":           return "PLC tokens were transferred";
  }
}

function timeAgo(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Component ───────────────────────────────────────────

export default function NotificationBell() {
  const { isConnected } = useWallet();
  const { notifications, unreadCount, add, markRead, markAllRead, clear } = useNotifications();
  const { events } = useContractEvents(isConnected);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevEventCountRef = useRef(0);

  // Generate notifications from new contract events
  useEffect(() => {
    if (events.length === 0) return;
    if (prevEventCountRef.current === 0) {
      // First load — just record count, don't spam old events
      prevEventCountRef.current = events.length;
      return;
    }

    const newCount = events.length - prevEventCountRef.current;
    if (newCount <= 0) return;

    // Events are sorted newest-first, so new events are at the start
    const newEvents = events.slice(0, newCount);
    for (const event of newEvents) {
      const meta = EVENT_META[event.type];
      add({
        type: event.type,
        title: meta.title,
        message: eventToMessage(event.type),
      });
    }

    prevEventCountRef.current = events.length;
  }, [events, add]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!isConnected) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] rounded-2xl bg-card border border-border/50 shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => { clear(); setOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You&apos;ll be notified when events occur
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notif) => (
                  <NotificationRow
                    key={notif.id}
                    notification={notif}
                    onRead={() => markRead(notif.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notification row ────────────────────────────────────

function NotificationRow({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: () => void;
}) {
  const meta = EVENT_META[notification.type];
  const Icon = meta.icon;
  const [iconColor, iconBg] = meta.color.split(" ");

  return (
    <button
      onClick={onRead}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{notification.title}</p>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
    </button>
  );
}
