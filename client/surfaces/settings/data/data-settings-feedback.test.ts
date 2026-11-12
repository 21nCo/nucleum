import { beforeEach, describe, expect, it, vi } from "vitest";

const toasts = vi.hoisted(() => ({
  showProgress: vi.fn(),
  closeProgress: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  trigger: vi.fn()
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts
}));

import { runWithStatusToast } from "./data-settings-feedback";

const messages = { progress: "Working", success: "Done", failure: "Failed" };

describe("runWithStatusToast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("replaces the progress toast with a success toast", async () => {
    await expect(
      runWithStatusToast("op", messages, async () => {})
    ).resolves.toBe(true);
    expect(toasts.showProgress).toHaveBeenCalledWith("op", "Working");
    expect(toasts.success).toHaveBeenCalledWith("Done", {
      closeProgressId: "op"
    });
    expect(toasts.error).not.toHaveBeenCalled();
  });

  it("replaces the progress toast with a failure toast and reports the error", async () => {
    const onError = vi.fn();
    const error = new Error("nope");
    await expect(
      runWithStatusToast(
        "op",
        messages,
        async () => {
          throw error;
        },
        onError
      )
    ).resolves.toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
    expect(toasts.error).toHaveBeenCalledWith("Failed", {
      closeProgressId: "op"
    });
    expect(toasts.success).not.toHaveBeenCalled();
  });

  it("closes the progress toast silently when the operation ends early", async () => {
    await expect(
      runWithStatusToast("op", messages, async () => false)
    ).resolves.toBe(false);
    expect(toasts.closeProgress).toHaveBeenCalledWith("op");
    expect(toasts.success).not.toHaveBeenCalled();
    expect(toasts.error).not.toHaveBeenCalled();
  });
});
