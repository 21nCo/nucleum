import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { loadStubbedNavigation } from "./navigation.test.setup";

const navigation = await loadStubbedNavigation();

const hostFocusKey = navigation.resolveRecordSpecificSearchParam(
  "space:host1",
  "focus"
);
const pageFocusKey = navigation.resolveRecordSpecificSearchParam(
  "space:page1",
  "focus"
);

let gotoPath: ReturnType<typeof vi.spyOn>;

function showUrl(url: string) {
  window.history.replaceState({}, "", url);
}

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
    showUrl(`/tab?${hostFocusKey}=space%3Achild`);
    navigation.openResource("node:card", AccessMode.PAGE);
    const url = lastUrl();
    expect(url.searchParams.get(AccessMode.PAGE)).toBe("node:card");
    expect(url.searchParams.get(hostFocusKey)).toBe("space:child");
  });

  it("clears the focus of a space replaced by the opened page", () => {
    showUrl(`/tab?page=space%3Apage1&${pageFocusKey}=space%3Achild`);
    navigation.openResource("node:card", AccessMode.PAGE);
    expect(lastUrl().searchParams.has(pageFocusKey)).toBe(false);
  });

  it("keeps the host focus when the page over it closes", () => {
    showUrl(`/tab?page=node%3Acard&${hostFocusKey}=space%3Achild`);
    navigation.closeResource({ accessMode: AccessMode.PAGE });
    const url = lastUrl();
    expect(url.searchParams.has(AccessMode.PAGE)).toBe(false);
    expect(url.searchParams.get(hostFocusKey)).toBe("space:child");
  });

  it("clears the focus of a closed space page", () => {
    showUrl(`/tab?page=space%3Apage1&${pageFocusKey}=space%3Achild`);
    navigation.closeResource({ accessMode: AccessMode.PAGE });
    expect(lastUrl().searchParams.has(pageFocusKey)).toBe(false);
  });

  it("clears the focus of a closed beside-page space", () => {
    showUrl(
      `/tab?page=node%3Acard&besidePage=space%3Apage1&${pageFocusKey}=space%3Achild`
    );
    navigation.closeResource({ accessMode: AccessMode.BESIDE_PAGE });
    const url = lastUrl();
    expect(url.searchParams.has(AccessMode.BESIDE_PAGE)).toBe(false);
    expect(url.searchParams.has(pageFocusKey)).toBe(false);
  });

  it("clears the focus of a beside-page space closed with its page", () => {
    showUrl(
      `/tab?page=node%3Amain&besidePage=space%3Apage1&${pageFocusKey}=space%3Achild`
    );
    navigation.closeResource({ accessMode: AccessMode.PAGE });
    const url = lastUrl();
    expect(url.searchParams.has(AccessMode.BESIDE_PAGE)).toBe(false);
    expect(url.searchParams.has(pageFocusKey)).toBe(false);
  });

  it("clears the focus of a beside-page space removed by opening another page", () => {
    showUrl(
      `/tab?page=node%3Amain&besidePage=space%3Apage1&${pageFocusKey}=space%3Achild`
    );
    navigation.openResource("node:card", AccessMode.PAGE);
    const url = lastUrl();
    expect(url.searchParams.has(AccessMode.BESIDE_PAGE)).toBe(false);
    expect(url.searchParams.has(pageFocusKey)).toBe(false);
  });
});
