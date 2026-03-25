import { describe, it, expect } from "vitest";
import {
  formatAmount,
  toDecimal,
  displayAmount,
  parseInterval,
  formatInterval,
  mapPlanStatus,
  mapSubscriptionStatus,
  getDefaultRpcUrl,
  getNetworkPassphrase,
} from "./helpers";

describe("formatAmount", () => {
  it("converts whole numbers to stroops", () => {
    expect(formatAmount(10)).toBe(100000000n);
    expect(formatAmount(1)).toBe(10000000n);
    expect(formatAmount(0)).toBe(0n);
  });

  it("converts decimals to stroops", () => {
    expect(formatAmount(10.5)).toBe(105000000n);
    expect(formatAmount("0.0000001")).toBe(1n);
    expect(formatAmount("99.1234567")).toBe(991234567n);
  });

  it("truncates beyond 7 decimal places", () => {
    expect(formatAmount("1.12345678")).toBe(11234567n);
  });
});

describe("toDecimal", () => {
  it("converts stroops to decimal string", () => {
    expect(toDecimal(100000000n)).toBe("10.0000000");
    expect(toDecimal(105000000n)).toBe("10.5000000");
    expect(toDecimal(1n)).toBe("0.0000001");
    expect(toDecimal(0n)).toBe("0.0000000");
  });

  it("handles negative values", () => {
    expect(toDecimal(-50000000n)).toBe("-5.0000000");
  });
});

describe("displayAmount", () => {
  it("formats with symbol", () => {
    expect(displayAmount(100000000n, "XLM")).toBe("10 XLM");
    expect(displayAmount(105000000n, "PLC")).toBe("10.50 PLC");
  });

  it("formats without symbol", () => {
    expect(displayAmount(100000000n)).toBe("10");
  });
});

describe("parseInterval", () => {
  it("parses named intervals", () => {
    expect(parseInterval("hourly")).toBe(3600);
    expect(parseInterval("daily")).toBe(86400);
    expect(parseInterval("weekly")).toBe(604800);
    expect(parseInterval("monthly")).toBe(2592000);
  });

  it("passes through numbers", () => {
    expect(parseInterval(7200)).toBe(7200);
  });

  it("throws on unknown string", () => {
    expect(() => parseInterval("every2days")).toThrow('Unknown interval');
  });
});

describe("formatInterval", () => {
  it("maps known intervals to labels", () => {
    expect(formatInterval(3600)).toBe("hourly");
    expect(formatInterval(86400)).toBe("daily");
    expect(formatInterval(2592000)).toBe("monthly");
  });

  it("formats arbitrary seconds", () => {
    expect(formatInterval(30)).toBe("30s");
    expect(formatInterval(120)).toBe("2m");
    expect(formatInterval(7200)).toBe("2h");
    expect(formatInterval(172800)).toBe("2d");
  });
});

describe("enum mappers", () => {
  it("maps string plan status", () => {
    expect(mapPlanStatus("Active")).toBe("Active");
    expect(mapPlanStatus("Cancelled")).toBe("Cancelled");
  });

  it("maps object plan status", () => {
    expect(mapPlanStatus({ tag: "Paused" })).toBe("Paused");
  });

  it("defaults to Active", () => {
    expect(mapPlanStatus(42)).toBe("Active");
  });

  it("maps subscription status", () => {
    expect(mapSubscriptionStatus("Expired")).toBe("Expired");
    expect(mapSubscriptionStatus({ tag: "Cancelled" })).toBe("Cancelled");
  });
});

describe("network defaults", () => {
  it("returns testnet RPC", () => {
    expect(getDefaultRpcUrl("testnet")).toContain("testnet");
  });

  it("returns correct passphrases", () => {
    expect(getNetworkPassphrase("testnet")).toContain("Test SDF");
    expect(getNetworkPassphrase("mainnet")).toContain("Public Global");
  });
});
