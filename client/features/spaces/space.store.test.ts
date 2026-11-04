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

function nestedRecordItems() {
  return [
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
  ];
}

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
      items: nestedRecordItems()
    });
    await store.init();
    const items = store.readItems();
    expect(items.map((item) => item.id)).toEqual(["page", "child"]);
    expect(items[0].children).toBeUndefined();
  });

  it("appends to a saved record holding items under a record item as rows", async () => {
    const store = ActiveSpaceStore.resolve("space:nested-append");
    const saved = { id: "space:nested-append", items: nestedRecordItems() };
    mocks.select.mockResolvedValue(saved);
    mocks.mutate.mockResolvedValue({ ok: true });
    await store.init();
    const link = {
      id: "link",
      type: "resource",
      label: "Link",
      resourceId: "node:a",
      resourceType: "node"
    } as never;
    await expect(appendSpaceItems("space:nested-append", [link])).resolves.toBe(
      true
    );
    expect(store.readItems().map((item) => item.id)).toEqual([
      "page",
      "child",
      "link"
    ]);
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
    mocks.select.mockResolvedValueOnce({ id: "space:appending", items: [] });
    const appended = appendSpaceItems("space:appending", [link]);
    const added = store.addSection({ label: "Added meanwhile" });
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
    finishFirst({ ok: true });
    await expect(appended).resolves.toBe(true);
    const sectionId = await added;
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    const lastItems = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(lastItems.map((item) => item.id)).toEqual([sectionId, "link"]);
    expect(store.readItems().map((item) => item.id)).toEqual([
      sectionId,
      "link"
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

  it("replaces another account's pending items when the space loads", async () => {
    const store = ActiveSpaceStore.resolve("space:shared-id");
    mocks.select.mockResolvedValueOnce({ id: "space:shared-id", items: [] });
    await store.init();
    mocks.mutate.mockReturnValueOnce(new Promise(() => undefined));
    void store.addSection({ label: "From account A" });
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
    mocks.namespace = "account-b";
    const sectionB = {
      id: "b",
      type: "section",
      label: "From account B",
      children: []
    };
    mocks.select.mockResolvedValueOnce({
      id: "space:shared-id",
      items: [sectionB]
    });
    await store.init();
    expect(store.readItems().map((item) => item.label)).toEqual([
      "From account B"
    ]);
  });

  it("appends to the saved record when the open space holds another account's items", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:shared-append");
    const section = (id: string) => ({
      id,
      type: "section",
      label: id,
      children: []
    });
    mocks.select.mockResolvedValueOnce({
      id: "space:shared-append",
      items: [section("from-a")]
    });
    await store.init();
    mocks.namespace = "account-b";
    mocks.select
      .mockResolvedValueOnce({
        id: "space:shared-append",
        items: [section("from-b")]
      })
      .mockResolvedValueOnce({
        id: "space:shared-append",
        items: [section("from-b"), section("link")]
      });
    await expect(
      appendSpaceItems("space:shared-append", [section("link") as never])
    ).resolves.toBe(true);
    const saved = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(saved.map((item) => item.id)).toEqual(["from-b", "link"]);
    expect(store.readItems().map((item) => item.id)).toEqual([
      "from-b",
      "link"
    ]);
  });

  it("does not save edits to items still loaded from another account", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:stale-edit");
    mocks.select.mockResolvedValueOnce({ id: "space:stale-edit", items: [] });
    await store.init();
    mocks.namespace = "account-b";
    await expect(
      store.addSection({ label: "Edited after switching" })
    ).resolves.toBeUndefined();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("keeps a root item deleted while its save is pending when links are appended", async () => {
    const store = ActiveSpaceStore.resolve("space:deleted-root");
    const section = (id: string) =>
      ({ id, type: "section", label: id, children: [] }) as never;
    mocks.select.mockResolvedValueOnce({
      id: "space:deleted-root",
      items: [section("a"), section("b")]
    });
    await store.init();
    const saved = new Map<string, unknown>();
    mocks.mutate.mockImplementation(
      async (params: { record: { items: unknown } }) => {
        saved.set("items", params.record.items);
        return { ok: true };
      }
    );
    mocks.select.mockImplementation(async () => ({
      id: "space:deleted-root",
      items: saved.get("items") ?? [section("a"), section("b")]
    }));
    const removed = store.deleteNavItem("a");
    const appended = appendSpaceItems("space:deleted-root", [section("link")]);
    await removed;
    await appended;
    const ids = (saved.get("items") as { id: string }[]).map((item) => item.id);
    expect(ids).toEqual(["b", "link"]);
    expect(store.readItems().map((item) => item.id)).toEqual(["b", "link"]);
  });

  it("keeps a child saved elsewhere inside an untouched section when links are appended", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:remote-child");
    const child = {
      id: "x",
      type: "resource",
      label: "X",
      resourceId: "node:x",
      resourceType: "node"
    };
    mocks.select.mockResolvedValueOnce({
      id: "space:remote-child",
      items: [{ id: "s", type: "section", label: "S", children: [] }]
    });
    await store.init();
    await store.addSection({ label: "Local" });
    const localItems = store.readItems();
    mocks.select.mockResolvedValueOnce({
      id: "space:remote-child",
      items: [
        { id: "s", type: "section", label: "S", children: [child] },
        localItems[1]
      ]
    });
    await appendSpaceItems("space:remote-child", [
      { id: "link", type: "section", label: "Link", children: [] } as never
    ]);
    const lastItems = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
      children?: { id: string }[];
    }[];
    expect(lastItems[0].children?.map((item) => item.id)).toEqual(["x"]);
    expect(lastItems.map((item) => item.id)).toEqual([
      "s",
      localItems[1].id,
      "link"
    ]);
  });

  it("appends to a space whose view is still loading in order with the user's edits", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const store = ActiveSpaceStore.resolve("space:loading-append");
    const section = (id: string) => ({
      id,
      type: "section",
      label: id,
      children: []
    });
    let finishLoad: (value: unknown) => void = () => undefined;
    let finishRead: (value: unknown) => void = () => undefined;
    mocks.select
      .mockReturnValueOnce(new Promise((resolve) => (finishLoad = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
    const loading = store.init();
    const appended = appendSpaceItems("space:loading-append", [
      section("link") as never
    ]);
    finishLoad({ id: "space:loading-append", items: [section("saved")] });
    await loading;
    const edited = store.addSection({ label: "Edit" });
    finishRead({ id: "space:loading-append", items: [section("saved")] });
    await expect(appended).resolves.toBe(true);
    const editId = await edited;
    const saved = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(saved.map((item) => item.id)).toEqual(["saved", editId, "link"]);
    expect(store.readItems().map((item) => item.id)).toEqual([
      "saved",
      editId,
      "link"
    ]);
  });

  it("queues an append to a space without a view ahead of edits from a view opened meanwhile", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const id = "space:opened-during-append";
    const link = {
      id: "link",
      type: "section",
      label: "Link",
      children: []
    } as never;
    let finishRead: (value: unknown) => void = () => undefined;
    mocks.select
      .mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)))
      .mockResolvedValueOnce({ id, items: [] });
    const appended = appendSpaceItems(id, [link]);
    await Promise.resolve();
    expect(mocks.select).toHaveBeenCalledTimes(1);
    const store = ActiveSpaceStore.resolve(id);
    await store.init();
    const added = store.addSection({ label: "Section" });
    finishRead({ id, items: [] });
    await expect(appended).resolves.toBe(true);
    const sectionId = await added;
    const saved = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(saved.map((item) => item.id)).toEqual([sectionId, "link"]);
    expect(store.readItems().map((item) => item.id)).toEqual([
      sectionId,
      "link"
    ]);
  });

  it("stops an append to a space without a view when another account becomes active while it reads", async () => {
    let finishRead: (value: unknown) => void = () => undefined;
    mocks.select.mockReturnValueOnce(
      new Promise((resolve) => (finishRead = resolve))
    );
    const appended = appendSpaceItems("space:unopened", [
      { id: "link", type: "section", label: "Link", children: [] } as never
    ]);
    mocks.namespace = "account-b";
    finishRead({ id: "space:unopened", items: [] });
    await expect(appended).resolves.toBe(false);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("stops a queued append when another account becomes active while it reads", async () => {
    const store = ActiveSpaceStore.resolve("space:queued-switch");
    mocks.select.mockResolvedValueOnce({
      id: "space:queued-switch",
      items: []
    });
    await store.init();
    let finishRead: (value: unknown) => void = () => undefined;
    mocks.select.mockReturnValueOnce(
      new Promise((resolve) => (finishRead = resolve))
    );
    const appended = appendSpaceItems("space:queued-switch", [
      { id: "link", type: "section", label: "Link", children: [] } as never
    ]);
    await vi.waitFor(() => expect(mocks.select).toHaveBeenCalledTimes(2));
    mocks.namespace = "account-b";
    finishRead({ id: "space:queued-switch", items: [] });
    await expect(appended).resolves.toBe(false);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("does not append a second link to a record or page already in the space", async () => {
    mocks.mutate.mockResolvedValue({ ok: true });
    const existing = [
      {
        id: "added-by-editor",
        type: "resource",
        label: "A",
        resourceId: "node:a",
        resourceType: "node"
      },
      { id: "page-by-editor", type: "page", label: "P", path: "library/x/all" }
    ];
    mocks.select.mockResolvedValueOnce({
      id: "space:duplicate",
      items: existing
    });
    await appendSpaceItems("space:duplicate", [
      {
        id: "migrated",
        type: "resource",
        label: "A",
        resourceId: "node:a",
        resourceType: "node"
      } as never,
      {
        id: "migrated-page",
        type: "page",
        label: "P",
        path: "/library/x/all/"
      } as never
    ]);
    const saved = mocks.mutate.mock.calls.at(-1)?.[0].record.items as {
      id: string;
    }[];
    expect(saved.map((item) => item.id)).toEqual([
      "added-by-editor",
      "page-by-editor"
    ]);
  });

  it("does not append to a space in the trash", async () => {
    mocks.select.mockResolvedValueOnce({
      id: "space:trashed",
      items: [],
      trashedAt: 1
    });
    await expect(
      appendSpaceItems("space:trashed", [
        { id: "link", type: "section", label: "Link", children: [] } as never
      ])
    ).resolves.toBe(false);
    const store = ActiveSpaceStore.resolve("space:trashed-open");
    mocks.select.mockResolvedValueOnce({ id: "space:trashed-open", items: [] });
    await store.init();
    mocks.select.mockResolvedValueOnce({
      id: "space:trashed-open",
      items: [],
      trashedAt: 1
    });
    await expect(
      appendSpaceItems("space:trashed-open", [
        { id: "link", type: "section", label: "Link", children: [] } as never
      ])
    ).resolves.toBe(false);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
