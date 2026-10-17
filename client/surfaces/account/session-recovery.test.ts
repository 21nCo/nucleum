import { afterEach, expect, it, vi } from "vitest";
import { recoverInvalidAccountSession } from "./session-recovery";

const calls = vi.hoisted(() => ({ signout: vi.fn(), goto: vi.fn() }));
vi.mock("@nucleum/client/runtime/account/session-cleanup", () => ({
  signout: calls.signout
}));
vi.mock("@nucleum/client/runtime/navigation/navigation-request", () => ({
  goto: calls.goto
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("awaits cleanup before requesting login navigation and reloading", async () => {
  const order: string[] = [];
  calls.signout.mockImplementation(async () => {
    await Promise.resolve();
    order.push("cleanup");
  });
  calls.goto.mockImplementation(() => order.push("navigate"));
  vi.stubGlobal("window", { location: { reload: () => order.push("reload") } });
  await recoverInvalidAccountSession();
  expect(calls.goto).toHaveBeenCalledWith("/account/login");
  expect(order).toEqual(["cleanup", "navigate", "reload"]);
});

it("does not navigate or reload if cleanup fails", async () => {
  calls.signout.mockRejectedValueOnce(new Error("storage unavailable"));
  const reload = vi.fn();
  vi.stubGlobal("window", { location: { reload } });
  await expect(recoverInvalidAccountSession()).rejects.toThrow(
    "storage unavailable"
  );
  expect(calls.goto).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});
