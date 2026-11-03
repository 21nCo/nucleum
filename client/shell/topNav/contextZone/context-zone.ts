import type { Snippet } from "svelte";
import { getContext, setContext } from "svelte";
import { derived, get, writable } from "svelte/store";
import { AccessMode } from "@nucleum/datafn/resource.type";

/** Content layer a context-zone registration belongs to. */
export type ContextZonePane = {
  id: string;
  layer: number;
};

/** Values a registration supplies to the top bar context zone. */
export type ContextZoneRegistration = {
  content: Snippet;
  cycle?: () => void;
};

/** One registered context-zone entry. */
export type ContextZoneEntry = ContextZoneRegistration & {
  key: number;
  pane: ContextZonePane;
};

/** Base page pane used when content is not inside a layer scope. */
export const BASE_CONTEXT_ZONE_PANE: ContextZonePane = { id: "base", layer: 0 };

/** Layer order of the panes the shell renders. */
export const ContextZoneLayer = {
  BASE: 0,
  BESIDE_BASE: 1,
  PAGE: 2,
  BESIDE_PAGE: 3,
  OVERLAY: 4
} as const;

const PANE_CONTEXT_KEY = Symbol("context-zone-pane");

const entries = writable<ContextZoneEntry[]>([]);
const activePaneId = writable<string | undefined>(undefined);
const hostCount = writable(0);
let nextKey = 0;

/**
 * Picks the entry shown in the context zone: the newest entry of the pane the
 * user worked in last, otherwise the newest entry of the topmost pane.
 */
export function resolveContextZoneEntry(
  list: ContextZoneEntry[],
  activePane: string | undefined
): ContextZoneEntry | undefined {
  if (list.length === 0) return undefined;
  const newest = (items: ContextZoneEntry[]) =>
    items.reduce((latest, item) => (item.key > latest.key ? item : latest));
  const fromActive = activePane
    ? list.filter((item) => item.pane.id === activePane)
    : [];
  if (fromActive.length > 0) return newest(fromActive);
  const topLayer = Math.max(...list.map((item) => item.pane.layer));
  return newest(list.filter((item) => item.pane.layer === topLayer));
}

/** Returns the value after `current` in `values`, wrapping to the first. */
export function nextCycleValue<T>(values: T[], current: T | undefined) {
  if (values.length === 0) return undefined;
  const index = current === undefined ? -1 : values.indexOf(current);
  return values[(index + 1) % values.length];
}

/**
 * Shell-owned registry for the top bar context zone. Pages and resources
 * register a snippet for the pane they render in; the top bar renders the
 * entry of the pane the user is working in.
 */
export const contextZone = {
  entries: { subscribe: entries.subscribe },
  activePaneId: { subscribe: activePaneId.subscribe },
  isHosted: derived(hostCount, (count) => count > 0),
  active: derived([entries, activePaneId], ([list, pane]) =>
    resolveContextZoneEntry(list, pane)
  ),
  /** Marks a top bar as hosting the zone; returns its release function. */
  host() {
    hostCount.update((count) => count + 1);
    return () => hostCount.update((count) => Math.max(0, count - 1));
  },
  /** Registers content for a pane; returns its unregister function. */
  register(pane: ContextZonePane, registration: ContextZoneRegistration) {
    const key = ++nextKey;
    const entry: ContextZoneEntry = Object.defineProperties(
      { key, pane } as ContextZoneEntry,
      {
        content: { get: () => registration.content, enumerable: true },
        cycle: { get: () => registration.cycle, enumerable: true }
      }
    );
    entries.update((list) => [...list, entry]);
    return () => entries.update((list) => list.filter((x) => x.key !== key));
  },
  /** Records the pane the user last pointed at or focused. */
  activatePane(paneId: string) {
    if (get(activePaneId) !== paneId) activePaneId.set(paneId);
  },
  /** Clears the active pane when that pane leaves the screen. */
  releasePane(paneId: string) {
    if (get(activePaneId) === paneId) activePaneId.set(undefined);
  },
  /** Cycles the tabs or switcher of the active entry. */
  cycle() {
    get(contextZone.active)?.cycle?.();
  }
};

/** Declares the pane for context-zone registrations below this component. */
export function setContextZonePane(pane: ContextZonePane) {
  setContext(PANE_CONTEXT_KEY, pane);
}

/** Reads the pane for a registration, defaulting to the base page. */
export function getContextZonePane(): ContextZonePane {
  return (
    getContext<ContextZonePane | undefined>(PANE_CONTEXT_KEY) ??
    BASE_CONTEXT_ZONE_PANE
  );
}

const contextZoneAccessModes = new Set<string>([
  AccessMode.PAGE,
  AccessMode.BESIDE_BASE,
  AccessMode.BESIDE_PAGE,
  AccessMode.FULL
]);

/**
 * Whether a resource opened with this access mode shows its view tabs in the
 * top bar context zone instead of its own floating bar.
 */
export function isContextZoneAccessMode(accessMode: string | undefined) {
  return !!accessMode && contextZoneAccessModes.has(accessMode);
}
