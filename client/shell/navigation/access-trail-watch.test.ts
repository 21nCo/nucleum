import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { navigation } from "./navigation";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});

afterEach(() => vi.restoreAllMocks());

describe("navigation.watchAccessTrail", () => {
  it("syncs the trail with every page shown until it is stopped", () => {
    const sync = vi
      .spyOn(navigation, "syncAccessTrail")
      .mockImplementation(() => undefined);
    const state = { position: { trailId: "t", index: 0 } };
    const pages = writable<{ url?: URL; state?: unknown }>({
      url: new URL("https://app.test/home?page=node%3Aa"),
      state
    });
    const stop = navigation.watchAccessTrail(pages);
    expect(sync).toHaveBeenLastCalledWith("node:a", state);
    pages.set({ url: new URL("https://app.test/home") });
    expect(sync).toHaveBeenLastCalledWith(undefined, undefined);
    stop();
    pages.set({ url: new URL("https://app.test/home?page=node%3Ab") });
    expect(sync).toHaveBeenCalledTimes(2);
  });
});
