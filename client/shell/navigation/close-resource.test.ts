import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});

let gotoPath: ReturnType<typeof vi.spyOn>;

function lastUrl() {
  const path = gotoPath.mock.calls.at(-1)?.[0] as string;
  return new URL(path, window.location.origin);
}

beforeEach(() => {
  gotoPath = vi
    .spyOn(navigation, "gotoPath")
    .mockImplementation(async () => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("closeResource for in-place resources", () => {
  it("clears the library selection when the selected record is closed", () => {
    window.history.replaceState(
      {},
      "",
      "/collection_browse?selected=node%3Aone&selectedAt=1"
    );
    navigation.closeResource({ id: "node:one" });
    expect(lastUrl().searchParams.has("selected")).toBe(false);
    expect(lastUrl().searchParams.has("selectedAt")).toBe(false);
  });

  it("closes an in-place task without closing the page it sits in", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=objective%3Agoal&abcde-task=task%3Aone"
    );
    navigation.closeResource({ id: "task:one", accessMode: undefined });
    const url = lastUrl();
    expect(url.searchParams.get("page")).toBe("objective:goal");
    expect(url.searchParams.has("abcde-task")).toBe(false);
  });

  it("keeps another record's selection", () => {
    window.history.replaceState(
      {},
      "",
      "/collection_browse?selected=node%3Atwo"
    );
    navigation.closeResource({ id: "node:one" });
    const url = gotoPath.mock.calls.length
      ? lastUrl()
      : new URL(window.location.href);
    expect(url.searchParams.get("selected")).toBe("node:two");
  });

  it("still closes a page by its id", () => {
    window.history.replaceState({}, "", "/calendar?page=node%3Aone");
    navigation.closeResource({ id: "node:one" });
    expect(lastUrl().searchParams.has("page")).toBe(false);
  });
});
