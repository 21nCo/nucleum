import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const spaceId = "space:abcdefghij";
const focusKey = navigation.resolveRecordSpecificSearchParam(spaceId, "focus");

function openAndCaptureUrl(id: string, accessMode: AccessMode) {
  const goto = vi
    .spyOn(navigation, "gotoPath")
    .mockImplementation(() => undefined as never);
  navigation.openResource(id, accessMode);
  const target = goto.mock.calls.at(-1)?.[0];
  return new URL(String(target), window.location.origin);
}

beforeEach(() => {
  window.history.replaceState(
    {},
    "",
    `/library?page=${spaceId}&${focusKey}=space:child`
  );
});
afterEach(() => vi.restoreAllMocks());

describe("space focus across resource navigation", () => {
  it("keeps the focus of a space that stays open beside a new resource", () => {
    const url = openAndCaptureUrl("node:beside", AccessMode.BESIDE_PAGE);
    expect(url.searchParams.get(AccessMode.PAGE)).toBe(spaceId);
    expect(url.searchParams.get(AccessMode.BESIDE_PAGE)).toBe("node:beside");
    expect(url.searchParams.get(focusKey)).toBe("space:child");
  });

  it("drops the focus of a space replaced by another page", () => {
    const url = openAndCaptureUrl("node:next", AccessMode.PAGE);
    expect(url.searchParams.get(AccessMode.PAGE)).toBe("node:next");
    expect(url.searchParams.has(focusKey)).toBe(false);
  });
});
