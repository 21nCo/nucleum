import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";

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

function show(url: string, state?: unknown) {
  window.history.replaceState({}, "", url);
  navigation.syncAccessTrail(
    new URL(url, window.location.origin).searchParams.get("page") ?? undefined,
    state
  );
}

function isNavigatorOpen() {
  return (
    new URL(window.location.href).searchParams.get("panel") === "navigator"
  );
}

function openNavigator() {
  const url = new URL(window.location.href);
  url.searchParams.set("panel", "navigator");
  show(url.pathname + url.search);
}

beforeEach(() => {
  show("/home");
  vi.spyOn(navigation, "gotoPath").mockImplementation(
    async (path: string, props) => {
      const url = new URL(path, window.location.origin);
      show(
        url.pathname + url.search,
        props?.historyState ? { accessTrail: props.historyState } : undefined
      );
    }
  );
});
afterEach(() => vi.restoreAllMocks());

describe("navigator after opening a trail item", () => {
  it("closes the navigator when the trail selection asks for it", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigator();
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a"),
      { isKeepNavigator: false }
    );
    expect(new URL(window.location.href).searchParams.get("page")).toBe(
      "node:a"
    );
    expect(isNavigatorOpen()).toBe(false);
  });

  it("keeps the navigator open when the trail selection keeps it", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigator();
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a"),
      { isKeepNavigator: true }
    );
    expect(isNavigatorOpen()).toBe(true);
  });

  it("closes the navigator when reopening the open page without keeping it", () => {
    navigation.openResource("node:a", "page" as never);
    openNavigator();
    navigation.openResource("node:a", "page" as never, {
      trail: "start",
      isKeepNavigator: false
    });
    expect(isNavigatorOpen()).toBe(false);
  });
});
