import { get, readable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveResource = vi.fn();

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { table: () => ({ signal: () => ({}) }) }
}));
vi.mock("@datafn/svelte", () => ({
  toSvelteStore: () => readable({ data: [] })
}));
vi.mock("@nucleum/datafn/resource-query.utils", () => ({
  resolveResource: (id: string) => resolveResource(id)
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: (slug: string) =>
      slug === "calendar" ? { label: "Calendar", icon: "calendar" } : null
  })
}));

const { liveResource } = await import("./live-resource");

async function settle<T>(store: {
  subscribe: (run: (value: T) => void) => () => void;
}) {
  let value: T | undefined;
  const unsubscribe = store.subscribe((next) => (value = next));
  await Promise.resolve();
  await Promise.resolve();
  unsubscribe();
  return value as T;
}

describe("liveResource", () => {
  beforeEach(() => resolveResource.mockReset());

  it("labels a page action with its label and icon", () => {
    const value = get(liveResource("calendar"));
    expect(value.isResolved).toBe(true);
    expect(value.resource).toEqual({ label: "Calendar", icon: "calendar" });
  });

  it("resolves a record", async () => {
    resolveResource.mockResolvedValue({ id: "node:a", label: "Alpha" });
    const value = await settle(liveResource("node:a"));
    expect(value.isResolved).toBe(true);
    expect(value.resource?.label).toBe("Alpha");
  });

  it("ends resolved without a resource for a missing record", async () => {
    resolveResource.mockResolvedValue(undefined);
    const value = await settle(liveResource("node:gone"));
    expect(value.isResolved).toBe(true);
    expect(value.resource).toBeUndefined();
  });
});
