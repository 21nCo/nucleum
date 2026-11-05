import { vi } from "vitest";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { datafnRuntime } from "@nucleum/datafn/datafn.store";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";

/** Entry of the in-memory browser history. */
export type TestHistoryEntry = { url: string; state?: unknown };

let session = 0;

/**
 * Starts the access trails empty, as switching accounts does, so no trail of
 * an earlier test is current or recent.
 */
function resetAccessTrails() {
  accessTrail.get();
  datafnRuntime.set({ namespace: `test-history-${++session}` } as never);
}

/**
 * In-memory browser history for navigation tests. `entries` is kept in place,
 * so a test can hold it. `install` empties the access trails, starts the
 * history at `/home`, routes
 * `navigation.gotoPath` into it and returns the spy on `window.history.back`,
 * which goes back one entry.
 */
export function createTestHistory() {
  const entries: TestHistoryEntry[] = [];
  let index = 0;

  /** Shows the current entry and syncs the access trail with it. */
  function show() {
    const entry = entries[index];
    window.history.replaceState({}, "", entry.url);
    navigation.syncAccessTrail(
      new URL(entry.url, window.location.origin).searchParams.get("page") ??
        undefined,
      entry.state
    );
  }

  /** Moves `delta` entries through the history and shows the entry. */
  function go(delta: number) {
    index += delta;
    show();
  }

  /** Entry shown now. */
  function current() {
    return entries[index];
  }

  /** Sets a search parameter on the current entry without adding one. */
  function setSearchParam(key: string, value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    entries[index] = { ...entries[index], url: url.pathname + url.search };
    show();
  }

  function install() {
    resetAccessTrails();
    entries.splice(0, entries.length, { url: "/home" });
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
          entries.splice(index + 1, entries.length, { url: href, state });
          index += 1;
        }
        show();
      }
    );
    return vi.spyOn(window.history, "back").mockImplementation(() => go(-1));
  }

  return { entries, show, go, current, setSearchParam, install };
}

/** Active node of the current access trail, with its trail. */
export function activeNode() {
  const trail = accessTrail.get().current;
  return trail ? { trail, node: trail.nodes[trail.active] } : undefined;
}
