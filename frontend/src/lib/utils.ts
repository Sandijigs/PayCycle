import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TOKENS } from "@/lib/contracts";
import { INTERVALS, INTERVAL_LABELS, type IntervalKey } from "@/types/subscription";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resolve token info from a contract address */
export function resolveToken(tokenAddress: string) {
  const info = Object.values(TOKENS).find((t) => t.address === tokenAddress);
  return {
    symbol: info?.symbol || "TOKEN",
    name: info?.name || "Unknown Token",
    decimals: info?.decimals || 7,
  };
}

/** Format a stroops amount to human-readable */
export function formatAmount(amount: bigint | number, decimals = 7): string {
  return (Number(amount) / 10 ** decimals).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Resolve interval seconds to a human label */
export function formatInterval(seconds: number): string {
  const key = Object.entries(INTERVALS).find(
    ([, s]) => s === seconds
  )?.[0] as IntervalKey | undefined;
  if (key) return INTERVAL_LABELS[key].toLowerCase();
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Relative time from unix seconds */
export function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Truncate a Stellar address */
export function truncateAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}
