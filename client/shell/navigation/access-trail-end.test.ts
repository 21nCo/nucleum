import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";

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

function currentIds() {
  return accessTrail.get().current?.nodes.map((node) => node.id);
}

beforeEach(() => {
  navigation.syncAccessTrail(undefined);
  accessTrail.end();
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
        entries[index] = { url: href, state };
      } else {
        entries = [...entries.slice(0, index + 1), { url: href, state }];
        index += 1;
      }
      show();
    }
  );
  vi.spyOn(window.history, "back").mockImplementation(() => go(-1));
});
afterEach(() => vi.restoreAllMocks());

describe("ending an access trail while its page stays open", () => {
  it("stays ended when only the navigator opens and closes", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.toggleSearchParam({ panel: "navigator" });
    navigation.endAccessTrail();
    expect(accessTrail.get().current).toBeUndefined();

    navigation.toggleSearchParam(["panel"]);
    navigation.toggleSearchParam({ panel: "navigator" });
    expect(accessTrail.get().current).toBeUndefined();
    expect(accessTrail.get().recent[0]?.nodes.map((node) => node.id)).toEqual(
      ["node:a", "node:b"]
    );
  });

  it("stays ended when a query change keeps the entry's trail state", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.endAccessTrail();

    navigation.syncAccessTrail("node:b", entries[index].state);
    expect(accessTrail.get().current).toBeUndefined();
  });

  it("starts a new trail on the next resource navigation", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.endAccessTrail();

    navigation.openResource("node:c", "page" as never);
    expect(currentIds()).toEqual(["node:c"]);
  });

  it("follows browser back to another page after ending", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.endAccessTrail();

    go(-1);
    expect(currentIds()).toEqual(["node:a", "node:b"]);
    expect(
      accessTrail.get().current?.nodes[accessTrail.get().current!.active].id
    ).toBe("node:a");
  });

  it("follows the page again after it closes and reopens", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.endAccessTrail();
    navigation.closeResource({ accessMode: "page" as never });
    expect(accessTrail.get().current).toBeUndefined();

    navigation.openResource("node:a", "page" as never);
    expect(currentIds()).toEqual(["node:a"]);
  });
});
