import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  select: vi.fn(),
  namespace: "account-a",
  toastError: vi.fn()
}));

vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: {
      currentNamespace: () => mocks.namespace,
      space: { mutate: mocks.mutate, select: mocks.select }
    },
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

import { get } from "svelte/store";
import {
  ActiveSpaceStore,
  appendSpaceItems
} from "@nucleum/features/spaces/space.store";
import { SpaceView } from "@nucleum/features/spaces/space.type";

describe("space writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.namespace = "account-a";
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
    const firstRead = new Promise((resolve) => (resolveFirst = resolve));
    mocks.select
      .mockReturnValueOnce(firstRead)
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));
    const settled: string[] = [];
    const first = store.init().then(() => settled.push("first"));
    const second = store.init().then(() => settled.push("second"));
    resolveFirst({ id: "space:overlapping", items: [section("a")] });
    await firstRead;
    resolveSecond({
      id: "space:overlapping",
      items: [section("a"), section("b")]
    });
    await Promise.all([first, second]);
    expect(settled).toEqual(["second", "first"]);
    expect(store.readItems().map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("keeps an earlier section added after an overtaken load settles", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:overtaken");
    const saved = {
      id: "saved",
      type: "section",
      label: "Saved",
      children: []
    };
    let resolveFirst: (value: unknown) => void = () => undefined;
    let resolveSecond: (value: unknown) => void = () => undefined;
    const firstRead = new Promise((resolve) => (resolveFirst = resolve));
    mocks.select
      .mockReturnValueOnce(firstRead)
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));
    const added = store.init().then(() => store.addSection({ label: "Added" }));
    const second = store.init();
    resolveFirst({ id: "space:overtaken", items: [saved] });
    await firstRead;
    resolveSecond({ id: "space:overtaken", items: [saved] });
    const [id] = await Promise.all([added, second]);
    expect(store.readItems().map((item) => item.id)).toEqual(["saved", id]);
  });

  it("keeps a title and view changed while an open space reloads", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:renaming");
    await store.init();
    let resolveSelect: (value: unknown) => void = () => undefined;
    mocks.select.mockReturnValueOnce(
      new Promise((resolve) => (resolveSelect = resolve))
    );
    const reload = store.init();
    await store.updateLabel("Renamed");
    await store.updateView(SpaceView.WALL);
    resolveSelect({ id: "space:renaming", label: "Saved", items: [] });
    await reload;
    expect(get(store)).toMatchObject({
      label: "Renamed",
      view: SpaceView.WALL
    });
  });

  it("shows items saved under a record item as rows after it", async () => {
    const store = ActiveSpaceStore.resolve("space:nested-records");
    mocks.select.mockResolvedValueOnce({
      id: "space:nested-records",
      items: [
        {
          id: "page",
          label: "Page",
          type: "resource",
          resourceId: "node:page",
          resourceType: "node",
          children: [
            {
              id: "child",
              label: "Child",
              type: "resource",
              resourceId: "node:child",
              resourceType: "node"
            }
          ]
        }
      ]
    });
    await store.init();
    const items = store.readItems();
    expect(items.map((item) => item.id)).toEqual(["page", "child"]);
    expect(items[0].children).toBeUndefined();
  });

  it("saves items appended to an open space in order with the user's edits", async () => {
    const store = ActiveSpaceStore.resolve("space:appending");
    mocks.select.mockResolvedValueOnce({ id: "space:appending", items: [] });
    await store.init();
    let finishFirst: (value: unknown) => void = () => undefined;
    mocks.mutate
      .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue({ ok: true });
    const link = {
      id: "link",
      type: "resource",
      label: "Link",
      resourceId: "node:a",
      resourceType: "node"
    } as never;
    const appended = appendSpaceItems("space:appending", [link], []);
    const added = store.addSection({ label: "Added meanwhile" });
    await Promise.resolve();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    finishFirst({ ok: true });
    await expect(appended).resolves.toBe(true);
    const sectionId = await added;
    const lastItems = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(lastItems.map((item) => item.id)).toEqual(["link", sectionId]);
    expect(store.readItems().map((item) => item.id)).toEqual([
      "link",
      sectionId
    ]);
  });

  it("drops a queued write once another account is active", async () => {
    const store = ActiveSpaceStore.resolve("space:switching");
    mocks.select.mockResolvedValueOnce({ id: "space:switching", items: [] });
    await store.init();
    let finishFirst: (value: unknown) => void = () => undefined;
    mocks.mutate
      .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue({ ok: true });
    const first = store.addSection({ label: "First" });
    const second = store.addSection({ label: "Second" });
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
    mocks.namespace = "account-b";
    finishFirst({ ok: true });
    await first;
    await expect(second).resolves.toBeUndefined();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it("keeps later edits shown when an earlier write fails", async () => {
    const store = ActiveSpaceStore.resolve("space:recovering");
    mocks.select.mockResolvedValueOnce({ id: "space:recovering", items: [] });
    await store.init();
    let failFirst: (error: Error) => void = () => undefined;
    mocks.mutate
      .mockReturnValueOnce(new Promise((_, reject) => (failFirst = reject)))
      .mockResolvedValue({ ok: true });
    const first = store.addSection({ label: "A" });
    const second = store.addSection({ label: "B" });
    failFirst(new Error("offline"));
    await first;
    const secondId = await second;
    expect(store.readItems().map((item) => item.label)).toEqual(["A", "B"]);
    const thirdId = await store.addSection({ label: "C" });
    const lastItems = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(lastItems.map((item) => item.id)).toContain(secondId);
    expect(lastItems.map((item) => item.id)).toContain(thirdId);
  });
});
