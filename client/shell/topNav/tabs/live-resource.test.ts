import { get, writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signal = writable<{
  data: unknown[];
  loading?: boolean;
  error?: unknown;
}>({
  data: [],
  loading: false
});

let signalValue: unknown[] | undefined;

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { table: () => ({ signal: () => ({ get: () => signalValue }) }) }
}));
vi.mock("@datafn/svelte", () => ({
  toSvelteStore: () => signal
}));
vi.mock("@nucleum/datafn/resource-query.utils", () => ({
  normalizeResourceRecord: (_resource: string, record: object) => record
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
    signalValue = undefined;
    signal.set({ data: [], loading: false });
  });

  it("labels a page action with its label and icon", () => {
    const value = get(liveResource("calendar"));
    expect(value.isResolved).toBe(true);
    expect(value.resource).toEqual({ label: "Calendar", icon: "calendar" });
  });

  it("resolves a record from its signal", async () => {
    signal.set({ data: [{ id: "node:a", label: "Alpha" }] });
    const value = await settle(liveResource("node:a"));
    expect(value.isResolved).toBe(true);
    expect(value.resource?.label).toBe("Alpha");
  });

  it("stays unresolved until the signal has fetched", () => {
    const states: boolean[] = [];
    const unsubscribe = liveResource("node:gone").subscribe((value) =>
      states.push(value.isResolved)
    );
    expect(states.at(-1)).toBe(false);
    signal.set({ data: [], loading: true });
    expect(states.at(-1)).toBe(false);
    signalValue = [];
    signal.set({ data: [], loading: false });
    unsubscribe();
    expect(states.at(-1)).toBe(true);
  });

  it("resolves at once from a signal that already settled empty", () => {
    signalValue = [];
    const value = get(liveResource("node:gone"));
    expect(value.isResolved).toBe(true);
    expect(value.resource).toBeUndefined();
  });

  it("ends resolved without a resource for a missing record", async () => {
    const store = liveResource("node:gone");
    const unsubscribe = store.subscribe(() => {});
    signalValue = [];
    signal.set({ data: [], loading: false });
    const value = get(store);
    unsubscribe();
    expect(value.isResolved).toBe(true);
    expect(value.resource).toBeUndefined();
  });

  it("follows record changes from the signal", async () => {
    signal.set({ data: [{ id: "node:a", label: "Alpha" }] });
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

  it("ends resolved without a resource when the read fails", () => {
    const store = liveResource("node:a");
    const unsubscribe = store.subscribe(() => {});
    signal.set({ data: [], loading: false, error: new Error("offline") });
    const value = get(store);
    unsubscribe();
    expect(value.isResolved).toBe(true);
    expect(value.resource).toBeUndefined();
  });

  it("ignores values that arrive after unsubscribing", () => {
    const values: { isResolved: boolean }[] = [];
    const unsubscribe = liveResource("node:a").subscribe((value) =>
      values.push(value)
    );
    unsubscribe();
    signal.set({ data: [{ id: "node:a", label: "Late" }] });
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
