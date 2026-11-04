import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  select: vi.fn(),
  toastError: vi.fn()
}));

vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: { space: { mutate: mocks.mutate, select: mocks.select } },
    datafnRuntime: writable(undefined)
  };
});
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { error: mocks.toastError, success: vi.fn() }
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: { addToRecents: vi.fn() }
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { openResource: vi.fn() }
}));

import { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";

describe("space writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockResolvedValue({
      id: "space:failing",
      label: "Saved",
      items: []
    });
  });

  it("reports a failed write and returns no id for an unsaved section", async () => {
    mocks.mutate.mockRejectedValue(new Error("offline"));
    const store = ActiveSpaceStore.resolve("space:failing");
    await store.init();
    const id = await store.addSection({ label: "New section" });
    expect(id).toBeUndefined();
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to save space");
    expect(store.readItems()).toEqual([]);
  });

  it("returns false when a rename is not saved", async () => {
    mocks.mutate.mockRejectedValue(new Error("offline"));
    const store = ActiveSpaceStore.resolve("space:failing");
    await store.init();
    await expect(store.updateLabel("Renamed")).resolves.toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to save space");
  });
});
