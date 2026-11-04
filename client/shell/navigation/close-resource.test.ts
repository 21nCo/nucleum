import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { navigation } from "./navigation";
import { AccessMode } from "@nucleum/datafn/resource.type";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});

let gotoPath: MockInstance<typeof navigation.gotoPath>;

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

  it("keeps the page-side resource when closing an in-place task", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=objective%3Agoal&besidePage=node%3Aside&abcde-task=task%3Aone"
    );
    navigation.closeResource({ id: "task:one", accessMode: undefined });
    const url = lastUrl();
    expect(url.searchParams.get("page")).toBe("objective:goal");
    expect(url.searchParams.get("besidePage")).toBe("node:side");
    expect(url.searchParams.has("abcde-task")).toBe(false);
  });

  it("still clears the page-side resource when closing a page", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=node%3Aone&besidePage=node%3Aside"
    );
    navigation.closeResource({ id: "node:one" });
    const url = lastUrl();
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("besidePage")).toBe(false);
  });

  it("keeps another record's selection", () => {
    window.history.replaceState(
      {},
      "",
      "/collection_browse?selected=node%3Atwo"
    );
    navigation.closeResource({ id: "node:one" });
    expect(gotoPath).not.toHaveBeenCalled();
    expect(new URL(window.location.href).searchParams.get("selected")).toBe(
      "node:two"
    );
  });

  it("clears the opening timestamps of the layers it closes", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=node%3Aone&pageAt=1&beside=node%3Atwo&besideAt=2&besidePage=node%3Athree&besidePageAt=3"
    );
    navigation.closeResource();
    const url = lastUrl();
    expect(url.searchParams.has("pageAt")).toBe(false);
    expect(url.searchParams.has("besideAt")).toBe(false);
    expect(url.searchParams.has("besidePageAt")).toBe(false);
  });

  it("keeps the page-side timestamp when closing an in-place task", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=objective%3Agoal&pageAt=1&besidePage=node%3Aside&besidePageAt=3&abcde-task=task%3Aone"
    );
    navigation.closeResource({ id: "task:one" });
    const url = lastUrl();
    expect(url.searchParams.get("page")).toBe("objective:goal");
    expect(url.searchParams.get("pageAt")).toBe("1");
    expect(url.searchParams.get("besidePage")).toBe("node:side");
    expect(url.searchParams.get("besidePageAt")).toBe("3");
  });

  it("keeps the page timestamp when closing the resource beside the base", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=node%3Aone&pageAt=1&beside=node%3Atwo&besideAt=2"
    );
    navigation.closeResource({ accessMode: AccessMode.BESIDE_BASE });
    const url = lastUrl();
    expect(url.searchParams.get("page")).toBe("node:one");
    expect(url.searchParams.get("pageAt")).toBe("1");
    expect(url.searchParams.has("beside")).toBe(false);
    expect(url.searchParams.has("besideAt")).toBe(false);
  });

  it("still closes a page by its id", () => {
    window.history.replaceState({}, "", "/calendar?page=node%3Aone");
    navigation.closeResource({ id: "node:one" });
    expect(lastUrl().searchParams.has("page")).toBe(false);
  });
});
