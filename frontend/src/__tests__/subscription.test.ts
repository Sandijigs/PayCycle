import { describe, it, expect } from "vitest";
import {
  INTERVALS,
  INTERVAL_LABELS,
  CONTRACT_ERRORS,
  parseContractError,
} from "@/types/subscription";
import { TOKENS } from "@/lib/contracts";

describe("INTERVALS", () => {
  it("defines daily as 86400 seconds", () => {
    expect(INTERVALS.daily).toBe(86_400);
  });

  it("defines weekly as 604800 seconds", () => {
    expect(INTERVALS.weekly).toBe(604_800);
  });

  it("defines monthly as 2592000 seconds (30 days)", () => {
    expect(INTERVALS.monthly).toBe(2_592_000);
  });
});

describe("INTERVAL_LABELS", () => {
  it("has a label for every interval key", () => {
    for (const key of Object.keys(INTERVALS)) {
      expect(INTERVAL_LABELS[key as keyof typeof INTERVALS]).toBeDefined();
    }
  });
});

describe("CONTRACT_ERRORS", () => {
  it("maps all 12 error codes", () => {
    for (let i = 1; i <= 12; i++) {
      expect(CONTRACT_ERRORS[i]).toBeDefined();
      expect(typeof CONTRACT_ERRORS[i]).toBe("string");
    }
  });
});

describe("parseContractError", () => {
  it("extracts known contract error codes", () => {
    const err = new Error("HostError: Error(Contract, #2)");
    expect(parseContractError(err)).toBe("Plan not found");
  });

  it("returns generic message for unknown error codes", () => {
    const err = new Error("HostError: Error(Contract, #99)");
    expect(parseContractError(err)).toBe("Contract error #99");
  });

  it("detects wallet rejection", () => {
    const err = new Error("User declined the transaction");
    expect(parseContractError(err)).toBe("Transaction was rejected by the wallet");
  });

  it("passes through other Error messages", () => {
    const err = new Error("Network timeout");
    expect(parseContractError(err)).toBe("Network timeout");
  });

  it("handles non-Error values", () => {
    expect(parseContractError("something")).toBe("An unknown error occurred");
    expect(parseContractError(null)).toBe("An unknown error occurred");
  });
});

describe("TOKENS", () => {
  it("defines XLM with correct SAC address", () => {
    expect(TOKENS.XLM.symbol).toBe("XLM");
    expect(TOKENS.XLM.decimals).toBe(7);
    expect(TOKENS.XLM.address).toMatch(/^C[A-Z0-9]{55}$/);
  });

  it("defines USDC entry", () => {
    expect(TOKENS.USDC.symbol).toBe("USDC");
    expect(TOKENS.USDC.decimals).toBe(7);
  });
});
