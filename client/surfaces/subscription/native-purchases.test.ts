import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyPayment: vi.fn(),
  modifySubscription: vi.fn(),
  hide: vi.fn(),
  runAction: vi.fn(),
  error: vi.fn()
}));
vi.mock("./subscription", () => ({ subscription: mocks }));
vi.mock("@nucleum/shell/overlays/modal.store", () => ({ default: mocks }));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => mocks
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: mocks
}));

import { handleNativePurchase } from "./native-purchases";
import { Action } from "@nucleum/client/config/action.enum";

describe("native purchase workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies before completing loading and opening onboarding", async () => {
    const order: string[] = [];
    mocks.verifyPayment.mockImplementation(async () => {
      order.push("verify");
      return { status: "success" };
    });
    const handled = await handleNativePurchase(
      {
        type: "PURCHASE_SUCCESS",
        nonce: "nonce",
        embedTransaction: "transaction"
      },
      {
        verifying: () => order.push("loading"),
        finished: () => order.push("finished")
      }
    );
    expect(handled).toBe(true);
    expect(order).toEqual(["loading", "verify", "finished"]);
    expect(mocks.verifyPayment).toHaveBeenCalledWith("nonce", "transaction");
    expect(mocks.hide).toHaveBeenCalledWith(Action.USER_PLAN);
    expect(mocks.runAction).toHaveBeenCalledWith(Action.PLAN_ONBOARDING);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("reports unsuccessful verification without opening onboarding", async () => {
    mocks.verifyPayment.mockResolvedValue({ status: "failed" });
    await handleNativePurchase(
      { type: "PURCHASE_SUCCESS" },
      { verifying: vi.fn(), finished: vi.fn() }
    );
    expect(mocks.error).toHaveBeenCalledOnce();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("handles cancellation and restores through subscription sync", async () => {
    const loading = { verifying: vi.fn(), finished: vi.fn() };
    await handleNativePurchase({ type: "PURCHASE_ERROR" }, loading);
    expect(loading.finished).toHaveBeenCalledOnce();
    expect(mocks.error).toHaveBeenCalledOnce();
    await handleNativePurchase(
      { type: "RESTORE_PURCHASE_SUCCESS", embedTransaction: "restored" },
      loading
    );
    expect(mocks.modifySubscription).toHaveBeenCalledWith({
      type: "sync",
      embedTransaction: "restored"
    });
  });

  it("leaves non-purchase messages to their owning handler", async () => {
    const loading = { verifying: vi.fn(), finished: vi.fn() };
    expect(
      await handleNativePurchase({ type: "DOWNLOAD_SUCCESS" }, loading)
    ).toBe(false);
    expect(loading.finished).not.toHaveBeenCalled();
    expect(mocks.verifyPayment).not.toHaveBeenCalled();
  });
});
