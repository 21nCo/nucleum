import { beforeEach, describe, expect, it, vi } from "vitest";
import { writable, get } from "svelte/store";
import type { UserAccount } from "@nucleum/client/runtime/account/account.type";
import {
  UserDataMode,
  UserSessionType
} from "@nucleum/client/runtime/account/account.type";
import { PlanType } from "@nucleum/schema/account/subscription";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  refreshPlan: vi.fn(),
  gotoPath: vi.fn(),
  storageGet: vi.fn(),
  storageSet: vi.fn()
}));
const account = vi.hoisted(() => ({ current: undefined as any }));
vi.mock("@nucleum/client/runtime/account/account.store", () => ({
  default: {
    subscribe: (run: any) => account.current.subscribe(run),
    update: (run: any) => account.current.update(run),
    get: () => get(account.current)
  }
}));
vi.mock("@nucleum/client/runtime/account/auth", () => ({
  resolveAuthSession: mocks.resolve
}));
vi.mock("./account-session", () => ({
  accountSession: { refreshPlanData: mocks.refreshPlan }
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: mocks.gotoPath }
}));
vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: { get: mocks.storageGet, set: mocks.storageSet }
}));
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn() }
}));

import { performLoginStatusCheck } from "./session-access";

describe("product-configured account access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    account.current = writable<UserAccount>({
      dataMode: UserDataMode.CLOUD,
      sessionType: UserSessionType.RETURNING
    });
    mocks.storageGet.mockResolvedValue(null);
  });

  it("allows offline-only sessions without requiring a cloud plan", async () => {
    mocks.resolve.mockResolvedValue({ status: "offline-only" });
    expect(await performLoginStatusCheck(PlanType.NUCLEUS)).toBe(true);
    expect(mocks.refreshPlan).not.toHaveBeenCalled();
  });

  it("enforces the required plan for cached cloud sessions without imposing it on other products", async () => {
    account.current.update((value: UserAccount) => ({
      ...value,
      plan: { plan: "other" }
    }));
    mocks.resolve.mockResolvedValue({ status: "cached-cloud" });
    expect(await performLoginStatusCheck(PlanType.NUCLEUS)).toBe(false);
    expect(mocks.gotoPath).toHaveBeenCalledWith("/error/access-denied");
    expect(await performLoginStatusCheck()).toBe(true);
  });

  it("preserves cached-cloud access with no cached plan", async () => {
    mocks.resolve.mockResolvedValue({ status: "cached-cloud" });
    expect(await performLoginStatusCheck(PlanType.NUCLEUS)).toBe(true);
  });

  it("clears expired sessions and keeps unavailable sessions intact", async () => {
    mocks.resolve.mockResolvedValue({
      status: "unavailable",
      error: "offline"
    });
    expect(await performLoginStatusCheck()).toBe(false);
    expect(get<UserAccount>(account.current).dataMode).toBe(UserDataMode.CLOUD);
    mocks.resolve.mockResolvedValue({ status: "expired" });
    expect(await performLoginStatusCheck()).toBe(false);
    expect(get<UserAccount>(account.current).dataMode).toBe(UserDataMode.NONE);
    expect(mocks.gotoPath).toHaveBeenLastCalledWith("/account/login", {
      queryParams: { msg: "expired" },
      replaceState: true
    });
  });

  it("hydrates a fresh session before enforcing the refreshed plan", async () => {
    mocks.resolve.mockResolvedValue({
      status: "authenticated",
      session: {
        id: "session",
        actorId: "123",
        primaryEmail: "test@example.test",
        metadata: { nucleus: { isBootstrapped: true } }
      },
      storedState: {}
    });
    mocks.refreshPlan.mockResolvedValue({
      status: "resolved",
      plan: { plan: PlanType.NUCLEUS }
    });
    expect(await performLoginStatusCheck(PlanType.NUCLEUS)).toBe(true);
    expect(get<UserAccount>(account.current).userInfo?.id).toBe("user:123");
    expect(mocks.storageSet).toHaveBeenCalledTimes(2);
    expect(mocks.refreshPlan).toHaveBeenCalledOnce();
    expect(mocks.gotoPath).not.toHaveBeenCalled();
  });
});
