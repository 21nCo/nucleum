import { describe, expect, it, vi } from "vitest";
import {
  createNavigatorHistory,
  recordNavigatorVisit,
  type NavigatorHistory
} from "./navigator-history";
import { createNavigatorHistoryWriter } from "./navigator-history-writer";

const now = Date.UTC(2026, 10, 3);

function createStorage(initial: NavigatorHistory) {
  let stored: unknown = initial;
  let namespace: string | null = "user-a";
  let onRead: (() => void) | undefined;
  const writes: Array<() => void> = [];
  let isDeferred = false;
  let isFailing = false;
  return {
    storage: {
      namespace: () => namespace,
      read: async () => {
        onRead?.();
        return stored;
      },
      write: (history: NavigatorHistory) => {
        if (isFailing) return Promise.resolve(false);
        return new Promise<boolean>((resolve) => {
          const commit = () => {
            stored = history;
            resolve(true);
          };
          if (isDeferred) writes.push(commit);
          else commit();
        });
      },
      now: () => now
    },
    stored: () => stored as NavigatorHistory,
    setStored: (value: NavigatorHistory) => {
      stored = value;
    },
    switchNamespace: (value: string | null) => {
      namespace = value;
    },
    onRead: (callback: (() => void) | undefined) => {
      onRead = callback;
    },
    defer: (value: boolean) => {
      isDeferred = value;
    },
    fail: (value: boolean) => {
      isFailing = value;
    },
    pendingWrites: () => writes.length,
    releaseWrites: () => writes.splice(0).forEach((commit) => commit())
  };
}

describe("createNavigatorHistoryWriter", () => {
  it("merges pending visits into the stored history", async () => {
    const existing = recordNavigatorVisit(createNavigatorHistory(), {
      id: "node:a",
      kind: "resource",
      at: now - 60_000
    });
    const store = createStorage(existing);
    const writer = createNavigatorHistoryWriter(store.storage);

    writer.add({ id: "node:b", kind: "resource", at: now });
    await writer.flush();

    expect(Object.keys(store.stored().entries).sort()).toEqual([
      "node:a",
      "node:b"
    ]);
    expect(writer.pendingCount()).toBe(0);
  });

  it("keeps visits from an overlapping flush that is still writing", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    store.defer(true);

    writer.add({ id: "node:a", kind: "resource", at: now - 10_000 });
    const first = writer.flush();
    await vi.waitFor(() => expect(store.pendingWrites()).toBe(1));
    writer.add({ id: "node:b", kind: "resource", at: now });
    const second = writer.flush();
    store.releaseWrites();
    await first;
    await vi.waitFor(() => expect(store.pendingWrites()).toBe(1));
    store.releaseWrites();
    await second;

    expect(Object.keys(store.stored().entries).sort()).toEqual([
      "node:a",
      "node:b"
    ]);
    expect(writer.pendingCount()).toBe(0);
  });

  it("retains visits when a write fails and persists them on the next flush", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    store.fail(true);

    writer.add({ id: "node:a", kind: "resource", at: now });
    expect(await writer.flush()).toBeUndefined();
    expect(writer.pendingCount()).toBe(1);
    expect(
      writer.applyPending(createNavigatorHistory()).entries["node:a"]
    ).toBeDefined();

    store.fail(false);
    await writer.flush();

    expect(Object.keys(store.stored().entries)).toEqual(["node:a"]);
    expect(writer.pendingCount()).toBe(0);
  });

  it("drops visits recorded in another namespace", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    store.fail(true);
    writer.add({ id: "node:a", kind: "resource", at: now - 10_000 });
    await writer.flush();

    store.switchNamespace("user-b");
    store.setStored(createNavigatorHistory());
    store.fail(false);
    expect(
      writer.applyPending(createNavigatorHistory()).entries["node:a"]
    ).toBeUndefined();
    writer.add({ id: "node:b", kind: "resource", at: now });
    await writer.flush();

    expect(Object.keys(store.stored().entries)).toEqual(["node:b"]);
    expect(writer.pendingCount()).toBe(0);
  });

  it("waits for a namespace and adopts visits recorded before one was active", async () => {
    const store = createStorage(createNavigatorHistory());
    store.switchNamespace(null);
    const writer = createNavigatorHistoryWriter(store.storage);
    writer.add({ id: "node:a", kind: "resource", at: now });

    expect(await writer.flush()).toBeUndefined();
    expect(writer.pendingCount()).toBe(1);

    store.switchNamespace("user-a");
    await writer.flush();

    expect(Object.keys(store.stored().entries)).toEqual(["node:a"]);
    expect(writer.pendingCount()).toBe(0);
  });

  it("does not write when the namespace changes during a flush", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    writer.add({ id: "node:a", kind: "resource", at: now });
    store.onRead(() => store.switchNamespace("user-b"));

    expect(await writer.flush()).toBeUndefined();
    expect(store.stored().entries).toEqual({});

    store.onRead(undefined);
    await writer.flush();

    expect(store.stored().entries).toEqual({});
    expect(writer.pendingCount()).toBe(0);
  });

  it("does not double count visits replayed after an unacknowledged write", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    let isAcknowledged = false;
    const write = store.storage.write;
    store.storage.write = async (history) => {
      await write(history);
      return isAcknowledged;
    };
    writer.add({
      id: "node:b",
      kind: "resource",
      at: now - 5_000,
      origin: "node:a"
    });
    writer.add({ id: "node:b", kind: "resource", at: now, origin: "node:a" });
    await writer.flush();
    isAcknowledged = true;
    await writer.flush();

    expect(store.stored().entries["node:b"].opens).toEqual([now - 5_000, now]);
    expect(store.stored().entries["node:b"].from).toEqual({
      "node:a": [now - 5_000, now]
    });
    expect(writer.pendingCount()).toBe(0);
  });

  it("returns no result when the namespace changes while a write is pending", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    store.defer(true);
    writer.add({ id: "node:a", kind: "resource", at: now });
    const flushed = writer.flush();
    await vi.waitFor(() => expect(store.pendingWrites()).toBe(1));
    store.switchNamespace("user-b");
    store.releaseWrites();

    expect(await flushed).toBeUndefined();
    expect(writer.pendingCount()).toBe(0);
  });

  it("returns the written history with its namespace", async () => {
    const store = createStorage(createNavigatorHistory());
    const writer = createNavigatorHistoryWriter(store.storage);
    writer.add({ id: "node:a", kind: "resource", at: now });

    const result = await writer.flush();

    expect(result?.namespace).toBe("user-a");
    expect(Object.keys(result?.history.entries ?? {})).toEqual(["node:a"]);
  });

  it("binds visits recorded before any namespace to the first active one", async () => {
    const store = createStorage(createNavigatorHistory());
    store.switchNamespace(null);
    const writer = createNavigatorHistoryWriter(store.storage);
    writer.add({ id: "node:a", kind: "resource", at: now });

    store.switchNamespace("user-a");
    store.fail(true);
    await writer.flush();
    expect(writer.pendingCount()).toBe(1);

    store.switchNamespace("user-b");
    store.fail(false);
    writer.retainCurrentNamespace();
    expect(writer.pendingCount()).toBe(0);
    await writer.flush();

    expect(store.stored().entries).toEqual({});
  });
});
