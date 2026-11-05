import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { navigation } from "./navigation";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});
vi.mock("@nucleum/shell/navigator/navigator-history.store", () => ({
  navigatorHistory: { recordResource: () => undefined }
}));
vi.mock("@nucleum/shell/navigator/access-trail.store", () => ({
  accessTrail: {
    get: () => ({ current: undefined, recent: [] }),
    start: () => undefined,
    extend: () => undefined,
    position: () => undefined,
    sync: () => undefined
  }
}));

function visit(search: string) {
  window.history.replaceState(null, "", `/home${search}`);
}

afterEach(() => visit(""));

describe("navigation.resolveResourceHref", () => {
  it("drops the replaced page's record state and the beside page", () => {
    const pageFocus = navigation.resolveRecordSpecificSearchParam(
      "space:page1",
      "focus"
    );
    visit(
      `?${AccessMode.PAGE}=space:page1&${pageFocus}=space:sub&${AccessMode.BESIDE_PAGE}=node:beside&p1-tab=links&edit=true&${AccessMode.PANEL}=navigator`
    );
    const href = new URL(
      navigation.resolveResourceHref("node:mentioned", AccessMode.PAGE),
      window.location.origin
    );
    expect(href.pathname).toBe("/home");
    expect(Object.fromEntries(href.searchParams)).toEqual({
      [AccessMode.PAGE]: "node:mentioned",
      [AccessMode.PANEL]: "navigator"
    });
  });

  it("does not change the current URL", () => {
    visit(`?${AccessMode.BESIDE_PAGE}=node:beside`);
    navigation.resolveResourceHref("node:mentioned", AccessMode.PAGE);
    expect(window.location.search).toBe(
      `?${AccessMode.BESIDE_PAGE}=node:beside`
    );
  });
});
