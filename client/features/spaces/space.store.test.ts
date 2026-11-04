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

  it("keeps items edited while an open space reloads", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:reloading");
    await store.init();
    let resolveSelect: (value: unknown) => void = () => undefined;
    mocks.select.mockReturnValueOnce(
      new Promise((resolve) => (resolveSelect = resolve))
    );
    const reload = store.init();
    const id = await store.addSection({ label: "Added while loading" });
    resolveSelect({ id: "space:reloading", label: "Saved", items: [] });
    await reload;
    expect(store.readItems().map((item) => item.id)).toEqual([id]);
  });

  it("applies the latest of overlapping loads", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:overlapping");
    const section = (id: string) => ({
      id,
      type: "section",
      label: id,
      children: []
    });
    let resolveFirst: (value: unknown) => void = () => undefined;
    let resolveSecond: (value: unknown) => void = () => undefined;
    mocks.select
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));
    const first = store.init();
    const second = store.init();
    resolveFirst({ id: "space:overlapping", items: [section("a")] });
    await first;
    resolveSecond({
      id: "space:overlapping",
      items: [section("a"), section("b")]
    });
    await second;
    expect(store.readItems().map((item) => item.id)).toEqual(["a", "b"]);
  });
});
