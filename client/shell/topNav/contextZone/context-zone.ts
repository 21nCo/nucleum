import type { Snippet } from "svelte";
import { getContext, setContext } from "svelte";
import { derived, get, readable, writable, type Readable } from "svelte/store";
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
const visibleLayers = writable<ReadonlySet<number> | undefined>(undefined);
const hostCount = writable(0);
let nextKey = 0;

/**
 * Picks the entry shown in the context zone: the newest entry of the pane the
 * user worked in last, otherwise the newest entry of the topmost pane. Entries
 * of layers outside `visible`, such as a base page covered by a resource page,
 * are ignored.
 */
export function resolveContextZoneEntry(
  entries: ContextZoneEntry[],
  activePane: string | undefined,
  visible?: ReadonlySet<number>
): ContextZoneEntry | undefined {
  const list = visible
    ? entries.filter((item) => visible.has(item.pane.layer))
    : entries;
  if (list.length === 0) return undefined;
  const newest = (items: ContextZoneEntry[]) =>
    items.reduce(
      (latest, item) => (item.key > latest.key ? item : latest),
      items[0]
    );
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
  active: derived(
    [entries, activePaneId, visibleLayers],
    ([list, pane, visible]) => resolveContextZoneEntry(list, pane, visible)
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
  /**
   * Sets the layers the user can see; entries of other layers stay hidden.
   * Undefined shows every layer.
   */
  setVisibleLayers(layers: number[] | undefined) {
    const current = get(visibleLayers);
    if (
      current?.size === layers?.length &&
      (layers ?? []).every((layer) => current?.has(layer))
    )
      return;
    visibleLayers.set(layers ? new Set(layers) : undefined);
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

/**
 * Whether the content layer around the caller is visible: false while another
 * layer covers it, such as a page over the base page or a full-screen overlay
 * over both, or while `isCovered`, for a cover drawn over every layer such as
 * a full-screen sheet. Content outside a layer scope, such as a modal, counts
 * as visible.
 */
export function resolveContextZonePaneVisibility(
  isCovered: Readable<boolean> = readable(false)
): Readable<boolean> {
  const pane = getContext<ContextZonePane | undefined>(PANE_CONTEXT_KEY);
  if (!pane) return readable(true);
  return derived(
    [visibleLayers, isCovered],
    ([visible, covered]) => !covered && (!visible || visible.has(pane.layer))
  );
}

const contextZoneAccessModes = new Set<string>([
  AccessMode.PAGE,
  AccessMode.BESIDE_BASE,
  AccessMode.BESIDE_PAGE
]);

/**
 * Whether a resource opened with this access mode shows its view tabs in the
 * top bar context zone instead of its own floating bar.
 */
export function isContextZoneAccessMode(accessMode: string | undefined) {
  return !!accessMode && contextZoneAccessModes.has(accessMode);
}
