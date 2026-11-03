import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/datafn/datafn.store", () => ({ datafn: {} }));
vi.mock("@nucleum/client/runtime/account/session-token", () => ({
  resolveCurrentUserId: () => Promise.resolve(null)
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { error: vi.fn() }
}));
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { error: vi.fn(), log: vi.fn() }
}));

import { ActiveResourceStore } from "@nucleum/shared-state/resources/active-resource.store";

describe("ActiveResourceStore.retain", () => {
  it("keeps the store until the last mounted owner releases it", () => {
    const id = "node:retained";
    const store = ActiveResourceStore.resolve(id);
    const releaseBase = ActiveResourceStore.retain(id);
    const releasePage = ActiveResourceStore.retain(id);
    releasePage();
    releasePage();
    expect(ActiveResourceStore.resolve(id)).toBe(store);
    releaseBase();
    expect(ActiveResourceStore.resolve(id)).not.toBe(store);
  });

  it("gives the store back the access mode of the view still mounted", () => {
    const id = "node:modes";
    const store = ActiveResourceStore.resolve(id);
    store.set({ accessMode: undefined } as never);
    const releaseBase = ActiveResourceStore.retain(id, undefined);
    const releasePage = ActiveResourceStore.retain(id, "page" as never);
    store.update((prev) => ({ ...prev, accessMode: "page" }) as never);
    releasePage();
    expect(store.get().accessMode).toBeUndefined();
    releaseBase();
  });
});
