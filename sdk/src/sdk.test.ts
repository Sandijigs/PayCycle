import { describe, it, expect } from "vitest";
import { PayCycle, TESTNET_CONTRACTS } from "./index";

describe("PayCycle SDK", () => {
  it("instantiates with config", () => {
    const pc = new PayCycle({
      network: "testnet",
      contractId: TESTNET_CONTRACTS.subscription,
    });
    expect(pc).toBeInstanceOf(PayCycle);
  });

  it("instantiates with all optional fields", () => {
    const pc = new PayCycle({
      network: "testnet",
      contractId: TESTNET_CONTRACTS.subscription,
      plcTokenId: TESTNET_CONTRACTS.plcToken,
      keeperId: TESTNET_CONTRACTS.keeper,
      rpcUrl: "https://custom-rpc.example.com",
    });
    expect(pc).toBeInstanceOf(PayCycle);
  });

  it("exports all expected types and helpers", async () => {
    const mod = await import("./index");
    // Class
    expect(mod.PayCycle).toBeDefined();
    // Helpers
    expect(mod.formatAmount).toBeTypeOf("function");
    expect(mod.toDecimal).toBeTypeOf("function");
    expect(mod.displayAmount).toBeTypeOf("function");
    expect(mod.parseInterval).toBeTypeOf("function");
    expect(mod.formatInterval).toBeTypeOf("function");
    expect(mod.mapPlanStatus).toBeTypeOf("function");
    expect(mod.mapSubscriptionStatus).toBeTypeOf("function");
    expect(mod.getDefaultRpcUrl).toBeTypeOf("function");
    expect(mod.getNetworkPassphrase).toBeTypeOf("function");
    // Constants
    expect(mod.TESTNET_CONTRACTS).toBeDefined();
    expect(mod.TESTNET_CONTRACTS.subscription).toMatch(/^C/);
  });

  it("has all expected methods", () => {
    const pc = new PayCycle({
      network: "testnet",
      contractId: TESTNET_CONTRACTS.subscription,
    });
    // Write methods
    expect(pc.createPlan).toBeTypeOf("function");
    expect(pc.subscribe).toBeTypeOf("function");
    expect(pc.executePayment).toBeTypeOf("function");
    expect(pc.cancel).toBeTypeOf("function");
    expect(pc.pause).toBeTypeOf("function");
    expect(pc.resume).toBeTypeOf("function");
    // Read methods
    expect(pc.getPlan).toBeTypeOf("function");
    expect(pc.getSubscription).toBeTypeOf("function");
    expect(pc.getUserSubscriptions).toBeTypeOf("function");
    expect(pc.getPlanCount).toBeTypeOf("function");
    expect(pc.getSubCount).toBeTypeOf("function");
    expect(pc.getAllPlans).toBeTypeOf("function");
    // PLC methods
    expect(pc.getPlcBalance).toBeTypeOf("function");
    // Keeper methods
    expect(pc.executeAndReward).toBeTypeOf("function");
  });

  it("throws if keeper methods called without keeperId", async () => {
    const pc = new PayCycle({
      network: "testnet",
      contractId: TESTNET_CONTRACTS.subscription,
    });
    await expect(pc.executeAndReward("G...", 1)).rejects.toThrow(
      "keeperId not configured"
    );
  });

  it("throws if PLC methods called without plcTokenId", async () => {
    const pc = new PayCycle({
      network: "testnet",
      contractId: TESTNET_CONTRACTS.subscription,
    });
    await expect(pc.getPlcBalance("G...")).rejects.toThrow(
      "plcTokenId not configured"
    );
  });
});
