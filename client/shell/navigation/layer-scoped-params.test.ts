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

const hostFocusKey = navigation.resolveRecordSpecificSearchParam(
  "space:host1",
  "focus"
);
const pageFocusKey = navigation.resolveRecordSpecificSearchParam(
  "space:page1",
  "focus"
);

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

describe("layer-scoped record params", () => {
  it("keeps the focus of a space beneath a page opened over it", () => {
    window.history.replaceState({}, "", `/tab?${hostFocusKey}=space%3Achild`);
    navigation.openResource("node:card", AccessMode.PAGE);
    const url = lastUrl();
    expect(url.searchParams.get(AccessMode.PAGE)).toBe("node:card");
    expect(url.searchParams.get(hostFocusKey)).toBe("space:child");
  });

  it("clears the focus of a space replaced by the opened page", () => {
    window.history.replaceState(
      {},
      "",
      `/tab?page=space%3Apage1&${pageFocusKey}=space%3Achild`
    );
    navigation.openResource("node:card", AccessMode.PAGE);
    expect(lastUrl().searchParams.has(pageFocusKey)).toBe(false);
  });

  it("keeps the host focus when the page over it closes", () => {
    window.history.replaceState(
      {},
      "",
      `/tab?page=node%3Acard&${hostFocusKey}=space%3Achild`
    );
    navigation.closeResource({ accessMode: AccessMode.PAGE });
    const url = lastUrl();
    expect(url.searchParams.has(AccessMode.PAGE)).toBe(false);
    expect(url.searchParams.get(hostFocusKey)).toBe("space:child");
  });

  it("clears the focus of a closed space page", () => {
    window.history.replaceState(
      {},
      "",
      `/tab?page=space%3Apage1&${pageFocusKey}=space%3Achild`
    );
    navigation.closeResource({ accessMode: AccessMode.PAGE });
    expect(lastUrl().searchParams.has(pageFocusKey)).toBe(false);
  });
});
