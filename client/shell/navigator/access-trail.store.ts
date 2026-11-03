import { derived, get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import {
  activateAccessTrailNode,
  createAccessTrails,
  endAccessTrail,
  extendAccessTrail,
  normalizeAccessTrails,
  removeRecentAccessTrail,
  resumeAccessTrail,
  startAccessTrail,
  syncAccessTrailPage,
  type AccessTrailPosition,
  type AccessTrails
} from "@nucleum/shell/navigator/access-trail";

const FLUSH_DELAY_MS = 1000;

type TrailChange = (trails: AccessTrails) => AccessTrails;

const trailsLocal = writable<AccessTrails>(createAccessTrails());
let loadState: "idle" | "loading" | "loaded" = "idle";
let queued: TrailChange[] = [];
let isDirty = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let loadGeneration = 0;
let loadedNamespace: string | null = null;
let isWatchingRuntime = false;

function resolveNamespace() {
  return get(datafnRuntime)?.namespace ?? null;
}

/**
 * Reloads the trails when the DataFn namespace changes, such as after
 * switching accounts, so one account's trails never reach another's record.
 */
function watchRuntime() {
  if (isWatchingRuntime) return;
  isWatchingRuntime = true;
  datafnRuntime.subscribe((runtime) => {
    const namespace = runtime?.namespace ?? null;
    if (loadState === "idle" || namespace === loadedNamespace) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = undefined;
    isDirty = false;
    queued = [];
    loadState = "idle";
    trailsLocal.set(createAccessTrails());
    ensureLoaded();
  });
}

function ensureLoaded() {
  if (loadState !== "idle") return;
  loadState = "loading";
  loadedNamespace = resolveNamespace();
  const generation = ++loadGeneration;
  watchRuntime();
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushAccessTrails);
  }
  void datafn.kv
    .get<AccessTrails>(Resource.accessTrails)
    .catch((error) => {
      logger.error({ at: "accessTrail.load", error });
      return null;
    })
    .then((stored) => {
      if (generation !== loadGeneration) return;
      const base = normalizeAccessTrails(stored);
      const next = queued.reduce((trails, change) => change(trails), base);
      queued = [];
      loadState = "loaded";
      trailsLocal.set(next);
      if (next !== base) scheduleFlush();
    });
}

function scheduleFlush() {
  isDirty = true;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushAccessTrails, FLUSH_DELAY_MS);
}

function flushAccessTrails() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!isDirty || loadState !== "loaded") return;
  if (resolveNamespace() !== loadedNamespace) return;
  isDirty = false;
  void datafn.kv
    .set(Resource.accessTrails, get(trailsLocal))
    .then((result) => {
      if (!result.ok) {
        logger.error({ at: "accessTrail.flush", error: result.error });
      }
    })
    .catch((error) => logger.error({ at: "accessTrail.flush", error }));
}

/**
 * Applies a change now and, while the stored trails are loading, again on top
 * of them. Changes capture their keys and times up front, so a replay keeps
 * the trail identities history entries already recorded.
 */
function apply(change: TrailChange) {
  ensureLoaded();
  const current = get(trailsLocal);
  const next = change(current);
  if (loadState !== "loaded") queued.push(change);
  if (next === current) return;
  trailsLocal.set(next);
  if (loadState === "loaded") scheduleFlush();
}

function stamp() {
  return { key: generateSimpleRandomId(), at: Date.now() };
}

/**
 * Access trails: the tree of resources opened from one fresh open, and the
 * last trails before it. Persisted in the `accessTrails` DataFn KV record.
 */
export const accessTrail = {
  subscribe(run: (value: AccessTrails) => void) {
    ensureLoaded();
    return trailsLocal.subscribe(run);
  },
  get() {
    ensureLoaded();
    return get(trailsLocal);
  },
  /** Starts a new trail at `id`, keeping the previous one as a recent trail. */
  start(id: string, origin?: string) {
    const options = { ...stamp(), origin };
    apply((trails) => startAccessTrail(trails, id, options));
  },
  /** Records `id` as opened from the active resource of the current trail. */
  extend(id: string) {
    const options = stamp();
    apply((trails) => extendAccessTrail(trails, id, options));
  },
  /** Activates a node of the current trail. */
  select(index: number) {
    const at = Date.now();
    apply((trails) => activateAccessTrailNode(trails, index, at));
  },
  /**
   * Follows the open page after browser navigation; undefined ends the trail.
   * `position` is the trail node the history entry was opened at, when known.
   */
  sync(pageId: string | undefined, position?: AccessTrailPosition) {
    const options = { ...stamp(), position };
    apply((trails) => syncAccessTrailPage(trails, pageId, options));
  },
  /** Trail node that is active now, if a trail is current. */
  position(): AccessTrailPosition | undefined {
    const trail = accessTrail.get().current;
    return trail ? { trail: trail.key, node: trail.active } : undefined;
  },
  /** Keeps the current trail as a recent trail. */
  end() {
    apply(endAccessTrail);
  },
  /** Makes a recent trail current again. */
  resume(key: string) {
    const at = Date.now();
    apply((trails) => resumeAccessTrail(trails, key, at));
  },
  /** Removes a recent trail. */
  removeRecent(key: string) {
    apply((trails) => removeRecentAccessTrail(trails, key));
  }
};

/** Number of resources in the current trail. */
export const accessTrailCount = derived(
  { subscribe: accessTrail.subscribe },
  (trails) => trails.current?.nodes.length ?? 0
);
