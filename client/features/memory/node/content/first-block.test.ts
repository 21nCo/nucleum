import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { node: { query } }
}));

import { canCreateFirstBlock, readStoredNoteBlocks } from "./first-block";

function respond(note: Record<string, unknown> | null, blockIds: string[]) {
  query.mockImplementation(async (input?: { filters?: object }) => {
    return input?.filters && "id" in input.filters
      ? { data: note ? [note] : [] }
      : { data: blockIds.map((id) => ({ id })) };
  });
}

describe("first block guard", () => {
  beforeEach(() => query.mockReset());

  it("allows a starter block for a note with no stored blocks", async () => {
    respond({ id: "node:a", mdChildOrder: [] }, []);
    const stored = await readStoredNoteBlocks("node:a");
    expect(stored).toEqual({ mdChildOrder: [], hasBlocks: false });
    expect(canCreateFirstBlock(stored)).toBe(true);
  });

  it("refuses when the stored note already has a block order", async () => {
    respond({ id: "node:a", mdChildOrder: ["node:b", "node:c"] }, []);
    const stored = await readStoredNoteBlocks("node:a");
    expect(stored.mdChildOrder).toEqual(["node:b", "node:c"]);
    expect(canCreateFirstBlock(stored)).toBe(false);
  });

  it("refuses when blocks exist even though the order is missing", async () => {
    respond({ id: "node:a" }, ["node:b"]);
    const stored = await readStoredNoteBlocks("node:a");
    expect(canCreateFirstBlock(stored)).toBe(false);
  });

  it("reads trashed and archived records too, so hidden blocks still count", async () => {
    respond({ id: "node:a" }, []);
    await readStoredNoteBlocks("node:a");
    const calls = query.mock.calls.filter(([input]) => input);
    for (const [input] of calls) {
      expect(input.metadata).toEqual({
        includeTrashed: true,
        includeArchived: true,
        includeAncestorInactive: true
      });
    }
    expect(calls.map(([input]) => input.filters)).toEqual([
      { id: { eq: "node:a" } },
      { creationContext: { eq: "node:a" } }
    ]);
  });
});

describe("resolveNoteContentStart", () => {
  it("creates a starter block only for an empty stored note", async () => {
    const { resolveNoteContentStart } = await import("./first-block");
    expect(
      resolveNoteContentStart({ mdChildOrder: [], hasBlocks: false })
    ).toEqual({ kind: "create" });
  });

  it("loads the stored blocks when storage has a block order", async () => {
    const { resolveNoteContentStart } = await import("./first-block");
    expect(
      resolveNoteContentStart({ mdChildOrder: ["node:b"], hasBlocks: true })
    ).toEqual({ kind: "load", mdChildOrder: ["node:b"] });
  });

  it("holds when blocks exist without an order or storage couldn't be read", async () => {
    const { resolveNoteContentStart } = await import("./first-block");
    expect(
      resolveNoteContentStart({ mdChildOrder: [], hasBlocks: true })
    ).toEqual({ kind: "hold" });
    expect(resolveNoteContentStart(undefined)).toEqual({ kind: "hold" });
  });
});

describe("hasEveryStoredBlock", () => {
  it("is true only when every stored block id was loaded", async () => {
    const { hasEveryStoredBlock } = await import("./first-block");
    expect(
      hasEveryStoredBlock(
        ["node:a", "node:b"],
        [{ id: "node:a" }, { id: "node:b" }]
      )
    ).toBe(true);
    expect(hasEveryStoredBlock(["node:a", "node:b"], [{ id: "node:a" }])).toBe(
      false
    );
    expect(hasEveryStoredBlock(["node:a"], [])).toBe(false);
    expect(hasEveryStoredBlock([], [])).toBe(false);
  });
});
