import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { readable } from "svelte/store";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const hide = vi.hoisted(() => vi.fn());
const records = vi.hoisted(
  () => new Map<string, { label?: string; text?: string }>()
);

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: () => null,
    runAction: vi.fn()
  })
}));
vi.mock("@nucleum/shell/topNav/tabs/live-resource", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    liveResource: (id: string) =>
      readable({
        resource: records.get(id),
        action: undefined,
        resourceType: "node",
        isResolved: records.has(id)
      })
  };
});
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: {
    resolveShortcut: () => ({ shortcut: undefined, modifiers: [] }),
    subscribe: (run: (value: unknown) => void) => {
      run({});
      return () => undefined;
    }
  }
}));
vi.mock("@nucleum/shared-state/resources/resource-search", () => ({
  searchResources: vi.fn(async () => [])
}));
vi.mock("@nucleum/shell/overlays/modal.store", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    default: { ...(actual.default as object), hide }
  };
});

import CommandBar from "@nucleum/surfaces/commandBar/CommandBar.svelte";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { BASE_CONTEXT_ZONE_PANE } from "@nucleum/shell/topNav/contextZone/context-zone";

let release: (() => void) | undefined;

describe("super bar rows of the open resource", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.animate = vi.fn(() => ({
      cancel: () => undefined,
      finished: Promise.resolve()
    })) as never;
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    }));
  });

  afterEach(() => {
    release?.();
    release = undefined;
    hide.mockClear();
    records.clear();
  });

  it("show the resource badge on rows with and without a letter", async () => {
    records.set("node:1", { label: "Launch plan" });
    release = contextActions.register(BASE_CONTEXT_ZONE_PANE, {
      id: "node:1",
      resource: "node",
      resolve: () => [
        {
          group: "all",
          items: [
            {
              value: "star",
              label: "Star",
              hotKey: "s",
              callback: async () => {}
            },
            { value: "lock", label: "Lock", callback: async () => {} }
          ]
        }
      ]
    });
    const { getByText } = render(CommandBar);
    await tick();

    const star = getByText("Star").closest("button")!;
    const lock = getByText("Lock").closest("button")!;
    const badge = (row: Element) =>
      Array.from(row.querySelectorAll("div")).filter(
        (element) =>
          element.childElementCount === 0 &&
          element.textContent?.trim() === "node"
      );
    expect(badge(star)).toHaveLength(1);
    expect(badge(lock)).toHaveLength(1);
  });
});
