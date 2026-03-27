"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CONTRACTS } from "@/lib/contracts";
import { queryKeys } from "@/hooks/useContractQueries";

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

// ---- Types ----

export type EventType =
  | "plan_created"
  | "subscribed"
  | "payment_executed"
  | "subscription_cancelled"
  | "subscription_paused"
  | "subscription_resumed"
  | "plc_mint"
  | "plc_transfer";

export interface ContractEvent {
  id: string;
  type: EventType;
  timestamp: number;     // ledger close time (unix seconds)
  ledger: number;
  contractId: string;
  data: Record<string, unknown>;
}

// ---- RPC getEvents ----

interface RpcEventEntry {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  topic: string[];
  value: string;
}

interface GetEventsResponse {
  result?: {
    events: RpcEventEntry[];
    latestLedger: number;
  };
  error?: { message: string };
}

function decodeXdrValue(xdrBase64: string): unknown {
  // Simple XDR ScVal decoder for common patterns
  // Decode base64 to raw bytes
  const raw = atob(xdrBase64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }

  // ScVal type discriminant is the first 4 bytes (big-endian)
  const typeTag = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

  // SCV_U64 = 5
  if (typeTag === 5 && bytes.length >= 12) {
    let val = 0;
    for (let i = 4; i < 12; i++) {
      val = val * 256 + bytes[i];
    }
    return val;
  }

  // SCV_I128 = 10
  if (typeTag === 10 && bytes.length >= 20) {
    // Just return as string representation for display
    return xdrBase64;
  }

  // SCV_SYMBOL = 14 (symbol_short)
  if (typeTag === 14) {
    const len = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
    const chars = [];
    for (let i = 8; i < 8 + len; i++) {
      chars.push(String.fromCharCode(bytes[i]));
    }
    return chars.join("");
  }

  return xdrBase64;
}

function decodeTopicSymbol(xdrBase64: string): string {
  try {
    const decoded = decodeXdrValue(xdrBase64);
    return typeof decoded === "string" ? decoded : String(decoded);
  } catch {
    return xdrBase64;
  }
}

function classifyEvent(contractId: string, topics: string[]): EventType | null {
  if (topics.length < 2) return null;

  const t0 = decodeTopicSymbol(topics[0]);
  const t1 = decodeTopicSymbol(topics[1]);

  // Subscription contract events
  if (contractId === CONTRACTS.subscription) {
    if (t0 === "plan" && t1 === "created") return "plan_created";
    if (t0 === "sub" && t1 === "created") return "subscribed";
    if (t0 === "payment" && t1 === "exec") return "payment_executed";
    if (t0 === "sub" && t1 === "cancel") return "subscription_cancelled";
    if (t0 === "sub" && t1 === "paused") return "subscription_paused";
    if (t0 === "sub" && t1 === "resumed") return "subscription_resumed";
  }

  // PLC token events (SEP-41)
  if (contractId === CONTRACTS.token) {
    if (t0 === "mint") return "plc_mint";
    if (t0 === "transfer") return "plc_transfer";
  }

  return null;
}

function parseEvent(raw: RpcEventEntry): ContractEvent | null {
  const eventType = classifyEvent(raw.contractId, raw.topic);
  if (!eventType) return null;

  return {
    id: raw.id,
    type: eventType,
    timestamp: Math.floor(new Date(raw.ledgerClosedAt).getTime() / 1000),
    ledger: raw.ledger,
    contractId: raw.contractId,
    data: {
      topics: raw.topic,
      value: raw.value,
    },
  };
}

async function fetchContractEvents(startLedger: number): Promise<{
  events: ContractEvent[];
  latestLedger: number;
}> {
  const contractIds = [CONTRACTS.subscription, CONTRACTS.token].filter(Boolean);
  if (contractIds.length === 0) return { events: [], latestLedger: startLedger };

  const filters = contractIds.map((id) => ({
    type: "contract",
    contractIds: [id],
  }));

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getEvents",
    params: {
      startLedger,
      filters,
      pagination: { limit: 50 },
    },
  };

  const res = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json: GetEventsResponse = await res.json();

  if (json.error || !json.result) {
    return { events: [], latestLedger: startLedger };
  }

  const events = json.result.events
    .map(parseEvent)
    .filter((e): e is ContractEvent => e !== null);

  return { events, latestLedger: json.result.latestLedger };
}

async function getLatestLedger(): Promise<number> {
  const res = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getLatestLedger",
    }),
  });
  const json = await res.json();
  return json.result?.sequence || 0;
}

// ---- Hook ----

/**
 * Polls Soroban RPC `getEvents` for recent subscription and PLC token contract
 * events, classifies them by type, and auto-invalidates React Query caches
 * (plans, subscriptions, balances) when new events arrive.
 *
 * Refreshes every 15 s, looking back ~2 000 ledgers (~2.8 h at 5 s/ledger).
 *
 * @param enabled - Pass `false` to disable polling (e.g. when wallet is disconnected).
 * @returns `{ events, isLoading, error }` — events sorted newest-first.
 */
export function useContractEvents(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["contractEvents"],
    queryFn: async (): Promise<ContractEvent[]> => {
      // Fetch events from recent ledgers (~5 min window at ~5s/ledger = 60 ledgers)
      const latest = await getLatestLedger();
      const startLedger = Math.max(1, latest - 2000);

      const { events } = await fetchContractEvents(startLedger);

      // If we got new events, invalidate dashboard queries
      const prev = queryClient.getQueryData<ContractEvent[]>(["contractEvents"]);
      if (prev && events.length > prev.length) {
        queryClient.invalidateQueries({ queryKey: queryKeys.allPlans });
        // Invalidate all user subscription queries
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "merchantPlans" });
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "userSubscriptions" });
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "balance" });
      }

      return events.sort((a, b) => b.ledger - a.ledger);
    },
    enabled: enabled && (!!CONTRACTS.subscription || !!CONTRACTS.token),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: false,
  });

  return {
    events: data || [],
    isLoading,
    error: error as Error | null,
  };
}
