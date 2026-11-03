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
  const writes: Array<() => void> = [];
  let isDeferred = false;
  let isFailing = false;
  return {
    storage: {
      read: async () => stored,
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
});
