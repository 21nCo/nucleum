import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";

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

let gotoPath: ReturnType<typeof vi.spyOn>;
let historyBack: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.history.replaceState({}, "", "/home");
  navigation.syncAccessTrail(undefined);
  gotoPath = vi
    .spyOn(navigation, "gotoPath")
    .mockImplementation(async (path: string) => {
      window.history.pushState({}, "", path);
    });
  historyBack = vi
    .spyOn(window.history, "back")
    .mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("closing a page opened from the base page", () => {
  it("goes back in history only when the close asks for it", () => {
    navigation.openResource("node:one", "page" as never);
    navigation.syncAccessTrail("node:one");
    navigation.closeResource({ accessMode: "page" as never });
    expect(historyBack).not.toHaveBeenCalled();
    expect(new URL(window.location.href).searchParams.has("page")).toBe(false);

    navigation.syncAccessTrail(undefined);
    navigation.openResource("node:one", "page" as never);
    navigation.syncAccessTrail("node:one");
    navigation.closeResource({
      accessMode: "page" as never,
      isHistoryBack: true
    });
    expect(historyBack).toHaveBeenCalledTimes(1);
  });
});
