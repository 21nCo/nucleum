import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { navigation } from "./navigation";
import { tabs, vTrail } from "../topNav/tabs/tabs.store";

const state = vi.hoisted(() => ({ ids: [] as string[] }));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: {
    getState: () => state.ids,
    setState: (_key: unknown, ids: string[]) => {
      state.ids = ids;
    }
  }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});

beforeEach(() => {
  state.ids = [];
  window.history.replaceState({}, "", "/library?returnTo=overview");
});
afterEach(() => vi.restoreAllMocks());

describe("tab navigation ownership", () => {
  it("persists a tab before opening its resource with the return path", () => {
    vi.spyOn(navigation, "closeResource").mockImplementation(() => undefined);
    const open = vi
      .spyOn(navigation, "openResource")
      .mockImplementation(() => undefined);
    navigation.openTab("node:one");
    expect(tabs.get()).toEqual(["node:one"]);
    expect(open).toHaveBeenCalledWith("node:one", AccessMode.POP, {
      searchParams: { back: "/library", returnTo: "overview" }
    });
  });

  it("replaces the stored tab and preserves its existing back parameter", () => {
    state.ids = ["node:one"];
    window.history.replaceState({}, "", "/library?tab=node:one&back=/focus");
    vi.spyOn(navigation, "closeResource").mockImplementation(() => undefined);
    const open = vi
      .spyOn(navigation, "openResource")
      .mockImplementation(() => undefined);
    navigation.replaceTab("node:two", "node:one");
    expect(tabs.get()).toEqual(["node:two"]);
    expect(open).toHaveBeenCalledWith("node:two", AccessMode.POP, {
      searchParams: { back: "/focus" }
    });
  });

  it("selects a vertical trail item after requesting navigation", async () => {
    const { get } = await import("svelte/store");
    vTrail.clear();
    vTrail.add("node:root", "node:one");
    const open = vi
      .spyOn(navigation, "openResource")
      .mockImplementation(() => undefined);
    navigation.activateVerticalTrail("node:one");
    expect(open).toHaveBeenCalledWith("node:one", AccessMode.POP, {
      origin: "node:root"
    });
    expect(get(vTrail).activated).toBe("node:one");
  });
});
