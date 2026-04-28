"use client";

import { createContext, useContext, useCallback, useSyncExternalStore } from "react";
import type { EventType } from "@/hooks/useContractEvents";

// ─── Types ───────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: EventType;
  title: string;
  message: string;
  timestamp: number; // unix ms
  read: boolean;
}

export interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  add: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

// ─── localStorage-backed store ───────────────────────────

const STORAGE_KEY = "paycycle_notifications";
const MAX_NOTIFICATIONS = 50;

let listeners: Array<() => void> = [];
let cachedSnapshot: AppNotification[] = [];
const EMPTY: AppNotification[] = [];

function emitChange() {
  // Update cache before notifying listeners
  cachedSnapshot = readFromStorage();
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): AppNotification[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): AppNotification[] {
  return cachedSnapshot;
}

function getServerSnapshot(): AppNotification[] {
  return EMPTY;
}

// Initialize cache on module load (client only)
if (typeof window !== "undefined") {
  cachedSnapshot = readFromStorage();
}

function setNotifications(notifications: AppNotification[]) {
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  emitChange();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// ─── Hook ────────────────────────────────────────────────

export function useNotifications(): NotificationStore {
  const notifications = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const add = useCallback(
    (n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
      const current = getSnapshot();
      // Dedupe: don't add if same type+title exists within last 30s
      const recent = current.find(
        (existing) =>
          existing.type === n.type &&
          existing.title === n.title &&
          Date.now() - existing.timestamp < 30_000
      );
      if (recent) return;

      const notification: AppNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications([notification, ...current]);
    },
    []
  );

  const markRead = useCallback((id: string) => {
    const current = getSnapshot();
    setNotifications(
      current.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    const current = getSnapshot();
    setNotifications(current.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, unreadCount, add, markRead, markAllRead, clear };
}

// ─── Context (for shared access) ─────────────────────────

export const NotificationContext = createContext<NotificationStore | null>(null);

export function useNotificationContext(): NotificationStore {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
  return ctx;
}
