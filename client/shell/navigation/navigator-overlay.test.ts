import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
import view from "@21n/ui/environment/view.store";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: {
      kv: {
        get: async () => null,
        set: async () => ({ ok: true }),
        signal: () => ({
          subscribe: () => () => undefined,
          get: () => undefined
        })
      }
    },
    datafnRuntime: writable(undefined)
  };
});

type Entry = { url: string; state?: unknown };

let entries: Entry[] = [];
let index = 0;

function show() {
  const entry = entries[index];
  window.history.replaceState({}, "", entry.url);
  navigation.syncAccessTrail(
    new URL(entry.url, window.location.origin).searchParams.get("page") ??
      undefined,
    entry.state
  );
}

function go(delta: number) {
  index += delta;
  show();
}

function activeNode() {
  const trail = accessTrail.get().current;
  return trail ? { trail, node: trail.nodes[trail.active] } : undefined;
}

beforeEach(() => {
  entries = [{ url: "/home" }];
  index = 0;
  show();
  vi.spyOn(navigation, "gotoPath").mockImplementation(
    async (path: string, props) => {
      const url = new URL(path, window.location.origin);
      const href = url.pathname + url.search;
      const state = props?.historyState
        ? { accessTrail: props.historyState }
        : undefined;
      if (props?.replaceState) {
        entries[index] = { url: href, state: state ?? entries[index].state };
      } else {
        entries = [...entries.slice(0, index + 1), { url: href, state }];
        index += 1;
      }
      show();
    }
  );
  vi.spyOn(window.history, "back").mockImplementation(() => go(-1));
});
afterEach(() => {
  vi.restoreAllMocks();
  view.refresh(1280, 800);
});

function openNavigatorOverlay() {
  const url = new URL(window.location.href);
  url.searchParams.set("overlay", "navigator");
  entries[index] = { ...entries[index], url: url.pathname + url.search };
  show();
}

function overlay() {
  return new URL(window.location.href).searchParams.get("overlay");
}

describe("navigator opened as an overlay", () => {
  it("closes the navigator overlay when it opens a resource page", () => {
    view.refresh(800, 600);
    openNavigatorOverlay();
    navigation.openResource("node:a", "page" as never);
    expect(new URL(window.location.href).searchParams.get("page")).toBe(
      "node:a"
    );
    expect(overlay()).toBeNull();
  });

  it("closes the navigator overlay after it opens a trail node", () => {
    view.refresh(800, 600);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigatorOverlay();
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a")
    );
    expect(activeNode()?.node.id).toBe("node:a");
    expect(overlay()).toBeNull();
  });

  it("closes the navigator overlay when it reopens the open page", () => {
    view.refresh(800, 600);
    navigation.openResource("node:a", "page" as never);
    openNavigatorOverlay();
    navigation.openResource("node:a", "page" as never, {
      origin: "navigator" as never,
      trail: "start"
    });
    expect(new URL(window.location.href).searchParams.get("page")).toBe(
      "node:a"
    );
    expect(overlay()).toBeNull();
  });

  it("leaves other overlays open", () => {
    view.refresh(800, 600);
    const url = new URL(window.location.href);
    url.searchParams.set("overlay", "search");
    entries[index] = { ...entries[index], url: url.pathname + url.search };
    show();
    navigation.openResource("node:a", "page" as never);
    expect(overlay()).toBe("search");
  });
});
