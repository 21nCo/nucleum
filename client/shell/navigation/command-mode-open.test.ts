import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import view from "@21n/ui/environment/view.store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { InteractionMode } from "@21n/ui/elements/keyboard/interaction-mode.type";

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

type Entry = { url: string; state?: unknown };

let entries: Entry[] = [];
let index = 0;

function show() {
  const entry = entries[index];
  window.history.replaceState({}, "", entry.url);
  navigation.syncAccessTrail(
    new URL(entry.url, window.location.origin).searchParams.get("page") ??
      undefined,
    entry.state
  );
}

function go(delta: number) {
  index += delta;
  show();
}

beforeEach(() => {
  entries = [{ url: "/home" }];
  index = 0;
  show();
  vi.spyOn(navigation, "gotoPath").mockImplementation(
    async (path: string, props) => {
      const url = new URL(path, window.location.origin);
      const href = url.pathname + url.search;
      const state = props?.historyState
        ? { accessTrail: props.historyState }
        : undefined;
      if (props?.replaceState) {
        entries[index] = { url: href, state: state ?? entries[index].state };
      } else {
        entries = [...entries.slice(0, index + 1), { url: href, state }];
        index += 1;
      }
      show();
    }
  );
  vi.spyOn(window.history, "back").mockImplementation(() => go(-1));
});
afterEach(() => {
  vi.restoreAllMocks();
  view.refresh(1280, 800);
  setInteractionMode(InteractionMode.DEFAULT);
});

function setInteractionMode(interactionMode: InteractionMode) {
  appStore.update((store) => ({ ...store, interactionMode }));
}

function params() {
  return new URL(window.location.href).searchParams;
}

describe("opening beside a page in command mode", () => {
  it("opens the resource as the page instead of a split it cannot show", () => {
    setInteractionMode(InteractionMode.AGENT);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "beside" as never, {
      replaceId: "node:a"
    });
    expect(params().get("page")).toBe("node:b");
    expect(params().has("besidePage")).toBe(false);
    expect(params().has("beside")).toBe(false);
  });

  it("still opens a split outside command mode", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "beside" as never, {
      replaceId: "node:a"
    });
    expect(params().get("page")).toBe("node:a");
    expect(params().get("besidePage")).toBe("node:b");
  });
});
