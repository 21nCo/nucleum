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

describe("navigator labels", async () => {
  const { resolvePlainResourceLabel, resolveResourceTypeIcon, PAGE_TYPE_ICON } =
    await import("./live-resource");
  const { Resource } = await import("@nucleum/datafn/resource.enum");

  it("prefers the label, then the first text line, then Untitled", () => {
    expect(resolvePlainResourceLabel({ label: " Alpha " })).toBe("Alpha");
    expect(
      resolvePlainResourceLabel({ label: "", text: "\n# Heading one\nbody" })
    ).toBe("Heading one");
    expect(resolvePlainResourceLabel({ text: "  " })).toBe("Untitled");
    expect(resolvePlainResourceLabel(undefined)).toBe("Untitled");
  });

  it("uses the type icon for records and the page icon for pages", () => {
    const resolveIcon = (resource: string) => `icon-${resource}`;
    expect(
      resolveResourceTypeIcon({ resourceType: Resource.node }, resolveIcon)
    ).toBe("icon-node");
    expect(
      resolveResourceTypeIcon({ resourceType: Resource.unknown }, resolveIcon)
    ).toBe(PAGE_TYPE_ICON);
  });
});
