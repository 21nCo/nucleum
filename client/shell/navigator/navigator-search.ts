import { derived, writable } from "svelte/store";

type KeyHandler = (event: KeyboardEvent) => boolean;

const query = writable("");
const inlineCount = writable(0);
let keyHandler: KeyHandler | undefined;

/**
 * Search state of the navigator, shared between the navigator panel and the
 * search input the top bar shows in place of the navigator pill.
 */
export const navigatorSearch = {
  query,
  /** Whether the top bar hosts the navigator search input. */
  isInline: derived(inlineCount, (count) => count > 0),
  /** Marks the top bar as hosting the search input; returns its release function. */
  hostInline() {
    inlineCount.update((count) => count + 1);
    return () => inlineCount.update((count) => Math.max(0, count - 1));
  },
  /**
   * Sets the navigator's handler for keys typed in the search input; it
   * returns whether it handled the key. Returns its release function.
   */
  handleKeys(handler: KeyHandler) {
    keyHandler = handler;
    return () => {
      if (keyHandler === handler) keyHandler = undefined;
    };
  },
  /**
   * Passes a key typed in the search input to the navigator; returns whether
   * the navigator handled it, so unhandled keys can reach global shortcuts.
   */
  keydown(event: KeyboardEvent) {
    return keyHandler?.(event) ?? false;
  },
  /** Clears the query. */
  reset() {
    query.set("");
  }
};

/** Search results and the trimmed query they were found for. */
export type NavigatorSearchResults = {
  query: string;
  ids: string[];
};

/**
 * Resource that Enter opens from the navigator search: the selected result (the
 * first by default), only when the results belong to the current non-empty query.
 */
export function resolveNavigatorSearchTarget(
  query: string,
  results: NavigatorSearchResults,
  selectedIndex = 0
) {
  const trimmed = query.trim();
  if (!trimmed || results.query !== trimmed) return undefined;
  return results.ids[selectedIndex];
}
