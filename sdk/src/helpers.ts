import type { PlanStatus, SubscriptionStatus } from "./types";

// ──────────────────────────────────────────────
// Amount Formatting (7 decimals / stroops)
// ──────────────────────────────────────────────

const DECIMALS = 7;
const STROOP_MULTIPLIER = BigInt(10 ** DECIMALS);

/** Convert a human-readable amount (e.g. 10.5) to stroops (bigint). */
export function formatAmount(amount: number | string): bigint {
  const str = String(amount);
  const parts = str.split(".");
  const whole = BigInt(parts[0]) * STROOP_MULTIPLIER;
  if (parts.length === 1) return whole;

  const decimals = parts[1].padEnd(DECIMALS, "0").slice(0, DECIMALS);
  return whole + BigInt(decimals);
}

/** Convert stroops (bigint) to a human-readable string (e.g. "10.5000000"). */
export function toDecimal(stroops: bigint): string {
  const isNegative = stroops < 0n;
  const abs = isNegative ? -stroops : stroops;
  const whole = abs / STROOP_MULTIPLIER;
  const frac = (abs % STROOP_MULTIPLIER).toString().padStart(DECIMALS, "0");
  return `${isNegative ? "-" : ""}${whole}.${frac}`;
}

/** Convert stroops to a short display string (e.g. "10.5 XLM"). */
export function displayAmount(stroops: bigint, symbol?: string): string {
  const dec = toDecimal(stroops);
  // Trim trailing zeros but keep at least 2 decimal places
  const trimmed = dec.replace(/(\.\d{2})\d*?0+$/, "$1").replace(/\.00$/, "");
  return symbol ? `${trimmed} ${symbol}` : trimmed;
}

// ──────────────────────────────────────────────
// Interval Helpers
// ──────────────────────────────────────────────

const INTERVALS: Record<string, number> = {
  hourly: 3600,
  daily: 86400,
  weekly: 604800,
  biweekly: 1209600,
  monthly: 2592000,   // 30 days
  quarterly: 7776000, // 90 days
  yearly: 31536000,   // 365 days
};

/** Convert a human-readable interval name to seconds. */
export function parseInterval(interval: string | number): number {
  if (typeof interval === "number") return interval;
  const key = interval.toLowerCase();
  if (key in INTERVALS) return INTERVALS[key];
  throw new Error(
    `Unknown interval "${interval}". Use: ${Object.keys(INTERVALS).join(", ")} or a number (seconds).`
  );
}

/** Convert seconds to a human-readable label. */
export function formatInterval(seconds: number): string {
  for (const [label, secs] of Object.entries(INTERVALS)) {
    if (seconds === secs) return label;
  }
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

// ──────────────────────────────────────────────
// Enum Mappers
// ──────────────────────────────────────────────

/** Parse a Soroban enum return value to a PlanStatus string. */
export function mapPlanStatus(raw: unknown): PlanStatus {
  if (typeof raw === "string") return raw as PlanStatus;
  if (typeof raw === "object" && raw !== null && "tag" in raw) {
    return (raw as { tag: string }).tag as PlanStatus;
  }
  return "Active";
}

/** Parse a Soroban enum return value to a SubscriptionStatus string. */
export function mapSubscriptionStatus(raw: unknown): SubscriptionStatus {
  if (typeof raw === "string") return raw as SubscriptionStatus;
  if (typeof raw === "object" && raw !== null && "tag" in raw) {
    return (raw as { tag: string }).tag as SubscriptionStatus;
  }
  return "Active";
}

// ──────────────────────────────────────────────
// Network Defaults
// ──────────────────────────────────────────────

export function getDefaultRpcUrl(network: "testnet" | "mainnet"): string {
  return network === "mainnet"
    ? "https://soroban-rpc.mainnet.stellar.gateway.fm"
    : "https://soroban-testnet.stellar.org";
}

export function getNetworkPassphrase(network: "testnet" | "mainnet"): string {
  return network === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";
}
