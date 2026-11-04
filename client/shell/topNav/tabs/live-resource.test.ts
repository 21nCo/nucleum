import { get, writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveResource = vi.fn();
const signal = writable<{ data: unknown[] }>({ data: [] });

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { table: () => ({ signal: () => ({}) }) }
}));
vi.mock("@datafn/svelte", () => ({
  toSvelteStore: () => signal
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

const {
  liveResource,
  resolvePlainResourceLabel,
  resolveResourceTypeIcon,
  PAGE_TYPE_ICON
} = await import("./live-resource");
const { Resource } = await import("@nucleum/datafn/resource.enum");

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
  beforeEach(() => {
    resolveResource.mockReset();
    signal.set({ data: [] });
  });

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

  it("follows record changes from the signal", async () => {
    resolveResource.mockResolvedValue({ id: "node:a", label: "Alpha" });
    const labels: (string | undefined)[] = [];
    const unsubscribe = liveResource("node:a").subscribe((value) =>
      labels.push(value.resource?.label)
    );
    await Promise.resolve();
    await Promise.resolve();
    signal.set({ data: [{ id: "node:a", label: "Beta" }] });
    unsubscribe();
    expect(labels.at(-1)).toBe("Beta");
  });

  it("ends resolved without a resource when resolving fails", async () => {
    resolveResource.mockRejectedValue(new Error("offline"));
    const value = await settle(liveResource("node:a"));
    expect(value.isResolved).toBe(true);
    expect(value.resource).toBeUndefined();
  });

  it("ignores a resolution that arrives after unsubscribing", async () => {
    let finish: (value: unknown) => void = () => {};
    resolveResource.mockReturnValue(
      new Promise((resolve) => (finish = resolve))
    );
    const values: { isResolved: boolean }[] = [];
    const unsubscribe = liveResource("node:a").subscribe((value) =>
      values.push(value)
    );
    unsubscribe();
    finish({ id: "node:a", label: "Late" });
    await Promise.resolve();
    await Promise.resolve();
    expect(values.every((value) => !value.isResolved)).toBe(true);
  });
});

describe("navigator labels", () => {
  it("prefers the label, then the first text line, then Untitled", () => {
    expect(resolvePlainResourceLabel({ label: " Alpha " })).toBe("Alpha");
    expect(
      resolvePlainResourceLabel({ label: "", text: "\n# Heading one\nbody" })
    ).toBe("Heading one");
    expect(resolvePlainResourceLabel({ text: "  " })).toBe("Untitled");
    expect(resolvePlainResourceLabel(undefined)).toBe("Untitled");
  });

  it("strips nested Markdown markers and skips marker-only lines", () => {
    expect(resolvePlainResourceLabel({ text: "- [ ] Buy milk" })).toBe(
      "Buy milk"
    );
    expect(resolvePlainResourceLabel({ text: "---\n#\n-\n> Quote" })).toBe(
      "Quote"
    );
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
