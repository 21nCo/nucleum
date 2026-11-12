import type { Snippet } from "svelte";
import { getContext, setContext } from "svelte";
import { derived, get, readable, writable, type Readable } from "svelte/store";
import { AccessMode } from "@nucleum/datafn/resource.type";

/** Content layer a context-zone registration belongs to. */
export type ContextZonePane = {
  id: string;
  layer: number;
};

/**
 * Views a context-zone entry can switch between, in display order, with the
 * active view and a way to select another one.
 */
export type ContextZoneViews = {
  values: string[];
  active: string | undefined;
  select: (value: string) => void;
};

/** Values a registration supplies to the top bar context zone. */
export type ContextZoneRegistration = {
  content: Snippet;
  /** Views the keyboard can move between while this entry shows. */
  views?: ContextZoneViews;
  /**
   * Background class of the context tab while this entry shows, matching the
   * page or pane below, such as "bg-bgs2". Defaults to the page background.
   */
  surface?: string;
  /** Replaces the page identity's title, such as an editable title. */
  title?: Snippet;
};

/** Background class of the context tab when no entry declares one. */
export const DEFAULT_CONTEXT_ZONE_SURFACE = "bg-bgs1";

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
const viewSources = writable<
  { key: number; pane: ContextZonePane; source: { views?: ContextZoneViews } }[]
>([]);
const subViewSources = writable<ContextZoneSubViewSource[]>([]);
const panes = writable<{ key: number; pane: ContextZonePane }[]>([]);
const activePaneId = writable<string | undefined>(undefined);
const visibleLayers = writable<ReadonlySet<number> | undefined>(undefined);
const hostCount = writable(0);
const entryWidth = writable<number | undefined>(undefined);
let nextKey = 0;
let lastSubViewUse = 0;

function markSubViewsUsed(key: number) {
  lastSubViewUse += 1;
  const usedAt = lastSubViewUse;
  subViewSources.update((list) =>
    list.map((item) => (item.key === key ? { ...item, usedAt } : item))
  );
}

/**
 * Picks the entry shown in the context zone: the newest entry of the pane the
 * user worked in last, otherwise the newest entry of the topmost pane. Entries
 * of layers outside `visible`, such as a base page covered by a resource page,
 * are ignored.
 */
export function resolveContextZoneEntry<
  T extends { key: number; pane: ContextZonePane }
>(
  entries: T[],
  activePane: string | undefined,
  visible?: ReadonlySet<number>
): T | undefined {
  const list = visible
    ? entries.filter((item) => visible.has(item.pane.layer))
    : entries;
  if (list.length === 0) return undefined;
  const newest = (items: T[]) =>
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
  return stepCycleValue(values, current, 1);
}

/**
 * Returns the value `delta` places from `current` in `values`, wrapping at
 * both ends. Without a current value, a forward step returns the first value
 * and a backward step the last.
 */
export function stepCycleValue<T>(
  values: T[],
  current: T | undefined,
  delta: number
) {
  if (values.length === 0) return undefined;
  const index = current === undefined ? -1 : values.indexOf(current);
  if (index === -1) return delta >= 0 ? values[0] : values[values.length - 1];
  const length = values.length;
  return values[(((index + delta) % length) + length) % length];
}

/**
 * Picks the pane the context zone describes: the visible mounted pane the user
 * worked in last, otherwise the pane of the entry the zone would show,
 * otherwise the newest pane of the topmost visible layer.
 */
export function resolveContextZonePane(
  registered: { key: number; pane: ContextZonePane }[],
  mounted: { key: number; pane: ContextZonePane }[],
  activePane: string | undefined,
  visible?: ReadonlySet<number>
): ContextZonePane | undefined {
  const active = activePane
    ? mounted.find(
        (item) =>
          item.pane.id === activePane &&
          (!visible || visible.has(item.pane.layer))
      )
    : undefined;
  return (
    active?.pane ??
    resolveContextZoneEntry(registered, activePane, visible)?.pane ??
    resolveContextZoneEntry(mounted, activePane, visible)?.pane
  );
}

/**
 * Picks the entry shown for `pane`: its newest entry, or nothing when the
 * pane registered none. Without a pane it falls back to
 * `resolveContextZoneEntry`.
 */
export function resolveContextZonePaneEntry<
  T extends { key: number; pane: ContextZonePane }
>(
  registered: T[],
  pane: ContextZonePane | undefined,
  activePane: string | undefined,
  visible?: ReadonlySet<number>
): T | undefined {
  if (!pane) return resolveContextZoneEntry(registered, activePane, visible);
  return resolveContextZoneEntry(
    registered.filter((item) => item.pane.id === pane.id),
    pane.id,
    visible
  );
}

/**
 * Picks the views the keyboard moves between: the shown entry's views,
 * otherwise the views of the newest page switcher registered for the shown
 * pane, such as a switcher in a side panel.
 */
export function resolveContextZoneViews(
  entry: { views?: ContextZoneViews } | undefined,
  sources: {
    key: number;
    pane: ContextZonePane;
    source: { views?: ContextZoneViews };
  }[],
  pane: ContextZonePane | undefined
): ContextZoneViews | undefined {
  if (entry?.views) return entry.views;
  const candidates = sources.filter(
    (item) => item.source.views && (!pane || item.pane.id === pane.id)
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, item) =>
    item.key > latest.key ? item : latest
  ).source.views;
}

/**
 * Direction of an in-page switcher: horizontal switchers (view modes,
 * calendar scale) step with Option+Shift+Left/Right, vertical lists (settings
 * list, side navs) with Option+Up/Down.
 */
export type ContextZoneSwitcherAxis = "horizontal" | "vertical";

/** Where an in-page switcher lives and which keys step it. */
export type ContextZoneSubViewOptions = {
  axis?: ContextZoneSwitcherAxis;
  /** The switcher is inside a modal, so it steps only while a modal is in front. */
  isInModal?: boolean;
};

/** One in-page sub switcher registered for keyboard stepping. */
export type ContextZoneSubViewSource = {
  key: number;
  pane: ContextZonePane;
  source: { views?: ContextZoneViews };
  usedAt: number;
} & ContextZoneSubViewOptions;

/** Which switchers the keyboard is looking for. */
export type ContextZoneSubViewQuery = {
  axis?: ContextZoneSwitcherAxis;
  /** A modal is in front, so only switchers inside a modal count. */
  isModalOpen?: boolean;
};

/** Handle returned when a page registers an in-page sub switcher. */
export type ContextZoneSubViewRegistration = {
  /** Marks the switcher as the one the keyboard steps next. */
  touch: () => void;
  /** Removes the switcher. */
  release: () => void;
};

/**
 * Picks the in-page sub switcher the keyboard steps: among the switchers of
 * the shown pane that have views, the one used most recently (picked by the
 * keyboard or by the user in the switcher), otherwise the newest registered.
 */
export function resolveContextZoneSubViewSource(
  sources: ContextZoneSubViewSource[],
  pane: ContextZonePane | undefined,
  query: ContextZoneSubViewQuery = {}
): ContextZoneSubViewSource | undefined {
  const axis = query.axis ?? "horizontal";
  const candidates = sources.filter((item) => {
    if (!item.source.views || (item.axis ?? "horizontal") !== axis)
      return false;
    if (query.isModalOpen) return !!item.isInModal;
    return !item.isInModal && (!pane || item.pane.id === pane.id);
  });
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, item) =>
    item.usedAt > latest.usedAt ||
    (item.usedAt === latest.usedAt && item.key > latest.key)
      ? item
      : latest
  );
}

/** Mounted panes on visible layers, one per pane id, in mount order. */
export function resolveVisiblePanes(
  mounted: { key: number; pane: ContextZonePane }[],
  visible?: ReadonlySet<number>
): ContextZonePane[] {
  const seen = new Set<string>();
  return mounted
    .filter((item) => !visible || visible.has(item.pane.layer))
    .filter((item) => {
      if (seen.has(item.pane.id)) return false;
      seen.add(item.pane.id);
      return true;
    })
    .map((item) => item.pane);
}

const pane = derived(
  [entries, panes, activePaneId, visibleLayers],
  ([list, mounted, paneId, visible]) =>
    resolveContextZonePane(list, mounted, paneId, visible)
);

const active = derived(
  [entries, pane, activePaneId, visibleLayers],
  ([list, shown, paneId, visible]) =>
    resolveContextZonePaneEntry(list, shown, paneId, visible)
);

/**
 * Shell-owned registry for the top bar context zone. Pages and resources
 * register a snippet for the pane they render in; the top bar renders the
 * entry of the pane the user is working in.
 */
export const contextZone = {
  entries: { subscribe: entries.subscribe },
  activePaneId: { subscribe: activePaneId.subscribe },
  /** Layers the user can see; undefined means every layer counts. */
  visibleLayers: { subscribe: visibleLayers.subscribe },
  isHosted: derived(hostCount, (count) => count > 0),
  /**
   * Width, in pixels, the top bar can give the shown entry's controls without
   * scrolling; undefined until a top bar measures it.
   */
  entryWidth: { subscribe: entryWidth.subscribe },
  /** Records the width the top bar can give the shown entry's controls. */
  setEntryWidth(width: number | undefined) {
    if (get(entryWidth) !== width) entryWidth.set(width);
  },
  /** Entry shown in the zone: the newest entry of the described pane. */
  active,
  /** Pane whose page the context zone describes. */
  pane,
  /** Mounted panes on visible layers, in mount order, one per pane id. */
  visiblePanes: derived([panes, visibleLayers], ([list, visible]) =>
    resolveVisiblePanes(list, visible)
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
        views: { get: () => registration.views, enumerable: true },
        surface: { get: () => registration.surface, enumerable: true },
        title: { get: () => registration.title, enumerable: true }
      }
    );
    entries.update((list) => [...list, entry]);
    return () => entries.update((list) => list.filter((x) => x.key !== key));
  },
  /**
   * Registers views of a page switcher shown outside the context zone, such
   * as in a side panel, so the keyboard can move between them while the
   * shown entry has no views of its own; returns its unregister function.
   */
  registerViews(pane: ContextZonePane, source: { views?: ContextZoneViews }) {
    const key = ++nextKey;
    viewSources.update((list) => [...list, { key, pane, source }]);
    return () =>
      viewSources.update((list) => list.filter((x) => x.key !== key));
  },
  /**
   * Registers an in-page sub switcher, such as the bird view mode or the
   * calendar scale, that Option+Shift+Arrow steps through. Call `touch` when
   * the user picks a view in it, so the keyboard follows that switcher.
   */
  registerSubViews(
    pane: ContextZonePane,
    source: { views?: ContextZoneViews },
    options: ContextZoneSubViewOptions = {}
  ): ContextZoneSubViewRegistration {
    const key = ++nextKey;
    subViewSources.update((list) => [
      ...list,
      { key, pane, source, usedAt: 0, ...options }
    ]);
    return {
      touch: () => markSubViewsUsed(key),
      release: () =>
        subViewSources.update((list) => list.filter((x) => x.key !== key))
    };
  },
  /** Sub switcher views the keyboard steps in the pane the zone describes. */
  resolveSubViews(query: ContextZoneSubViewQuery = {}) {
    return resolveContextZoneSubViewSource(
      get(subViewSources),
      get(contextZone.pane),
      query
    )?.source.views;
  },
  /**
   * Moves the in-page sub switcher `delta` views along, wrapping at both
   * ends; returns whether a view was selected.
   */
  stepSub(delta: number, query: ContextZoneSubViewQuery = {}) {
    const source = resolveContextZoneSubViewSource(
      get(subViewSources),
      get(contextZone.pane),
      query
    );
    const views = source?.source.views;
    if (!source || !views) return false;
    const next = stepCycleValue(views.values, views.active, delta);
    if (next === undefined || next === views.active) return false;
    markSubViewsUsed(source.key);
    views.select(next);
    return true;
  },
  /** Records a mounted pane; returns its release function. */
  registerPane(pane: ContextZonePane) {
    const key = ++nextKey;
    panes.update((list) => [...list, { key, pane }]);
    return () => panes.update((list) => list.filter((x) => x.key !== key));
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
  /** Views the keyboard moves between in the pane the zone describes. */
  resolveViews() {
    return resolveContextZoneViews(
      get(contextZone.active),
      get(viewSources),
      get(contextZone.pane)
    );
  },
  /** Selects the next view of the shown entry, wrapping to the first. */
  cycle() {
    contextZone.step(1);
  },
  /**
   * Moves the shown entry `delta` views along, wrapping at both ends; returns
   * whether a view was selected.
   */
  step(delta: number) {
    const views = contextZone.resolveViews();
    if (!views) return false;
    const next = stepCycleValue(views.values, views.active, delta);
    if (next === undefined || next === views.active) return false;
    views.select(next);
    return true;
  },
  /**
   * Selects the view at `index` (zero based) of the shown entry; returns
   * whether a view was selected.
   */
  selectAt(index: number) {
    const views = contextZone.resolveViews();
    const value = views?.values[index];
    if (!views || value === undefined) return false;
    if (value !== views.active) views.select(value);
    return true;
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

/**
 * Whether a resource view shows its title, view tabs and actions in the top
 * bar context zone instead of its page body and floating bar: a top bar hosts
 * the zone at full width, and the resource is open as a page or split.
 */
export function isResourceInContextZone(
  isHosted: boolean,
  layout: { isPortrait: boolean; isConstrainedWidth: boolean },
  accessMode: string | undefined
) {
  return (
    isHosted &&
    !layout.isPortrait &&
    !layout.isConstrainedWidth &&
    isContextZoneAccessMode(accessMode)
  );
}
