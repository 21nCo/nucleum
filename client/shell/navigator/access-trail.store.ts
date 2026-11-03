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
  hasAccessTrailPosition,
  resolveAccessTrailPosition,
  resumeAccessTrail,
  startAccessTrail,
  syncAccessTrailPage,
  type AccessTrailPosition,
  type AccessTrails
} from "@nucleum/shell/navigator/access-trail";

const FLUSH_DELAY_MS = 1000;

type TrailChange = (trails: AccessTrails) => AccessTrails;

/** A change made before the stored trails loaded, with the node it made active. */
type QueuedChange = {
  change: TrailChange;
  position?: AccessTrailPosition;
};

const trailsLocal = writable<AccessTrails>(createAccessTrails());
let loadState: "idle" | "loading" | "loaded" = "idle";
let queued: QueuedChange[] = [];
const aliases = new Map<string, AccessTrailPosition>();
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
    aliases.clear();
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
      const next = queued.reduce((trails, item) => {
        const replayed = item.change(trails);
        const position = resolveAccessTrailPosition(replayed);
        if (
          item.position &&
          position &&
          (item.position.trail !== position.trail ||
            item.position.node !== position.node)
        ) {
          aliases.set(item.position.node, position);
        }
        return replayed;
      }, base);
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
  if (loadState !== "loaded") {
    queued.push({ change, position: resolveAccessTrailPosition(next) });
  }
  if (next === current) return;
  trailsLocal.set(next);
  if (loadState === "loaded") scheduleFlush();
}

function stamp() {
  return {
    key: generateSimpleRandomId(),
    nodeKey: generateSimpleRandomId(),
    at: Date.now()
  };
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
  /** Activates the node with key `nodeKey` in the current trail. */
  select(nodeKey: string) {
    const at = Date.now();
    apply((trails) =>
      activateAccessTrailNode(
        trails,
        trails.current?.nodes.findIndex((node) => node.key === nodeKey) ?? -1,
        at
      )
    );
  },
  /**
   * Follows the open page after browser navigation; undefined ends the trail.
   * `position` is the trail node the history entry was opened at, when known.
   */
  sync(pageId: string | undefined, position?: AccessTrailPosition) {
    const options = stamp();
    apply((trails) =>
      syncAccessTrailPage(trails, pageId, {
        ...options,
        position: accessTrail.resolve(position)
      })
    );
  },
  /** Trail node that is active now, if a trail is current. */
  position(): AccessTrailPosition | undefined {
    return resolveAccessTrailPosition(accessTrail.get());
  },
  /** Whether a position, after resolving it, names a node that still exists. */
  has(position: AccessTrailPosition | undefined) {
    return hasAccessTrailPosition(
      accessTrail.get(),
      accessTrail.resolve(position)
    );
  },
  /**
   * Resolves a position recorded in a history entry to the node it names now.
   * Nodes made while the stored trails loaded may have been merged into the
   * stored trail; their recorded positions follow them.
   */
  resolve(position: AccessTrailPosition | undefined) {
    let resolved = position;
    for (let hop = 0; resolved && hop < 10; hop++) {
      const alias = aliases.get(resolved.node);
      if (!alias) break;
      resolved = alias;
    }
    return resolved;
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
