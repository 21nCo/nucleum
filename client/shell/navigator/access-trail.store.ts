import { derived, get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import {
  activateAccessTrailNode,
  createAccessTrails,
  extendAccessTrail,
  mergeAccessTrails,
  normalizeAccessTrails,
  hasAccessTrailPosition,
  resolveAccessTrailPosition,
  resumeAccessTrail,
  startAccessTrail,
  syncAccessTrailPage,
  type AccessTrailPosition,
  type AccessTrails
} from "@nucleum/shell/navigator/access-trail";

const FLUSH_DELAY_MS = 1000;
const LOAD_RETRY_BASE_MS = 1000;
const LOAD_RETRY_MAX_MS = 30000;
const FLUSH_RETRY_BASE_MS = 2000;
const FLUSH_RETRY_MAX_MS = 60000;

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
let failedFlushes = 0;
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
    failedFlushes = 0;
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
  loadStored(generation, 0);
}

/**
 * Reads the stored trails and adopts them. A failed read is retried rather
 * than treated as an empty record, so a later flush never replaces trails it
 * could not read.
 */
function loadStored(generation: number, attempt: number) {
  void datafn.kv.get<AccessTrails>(Resource.accessTrails).then(
    (stored) => {
      if (generation !== loadGeneration) return;
      adoptStored(stored);
    },
    (error) => {
      if (generation !== loadGeneration) return;
      logger.error({ at: "accessTrail.load", error });
      setTimeout(
        () => {
          if (generation === loadGeneration)
            loadStored(generation, attempt + 1);
        },
        Math.min(LOAD_RETRY_BASE_MS * 2 ** attempt, LOAD_RETRY_MAX_MS)
      );
    }
  );
}

function adoptStored(stored: AccessTrails | null | undefined) {
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
}

function scheduleFlush() {
  isDirty = true;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushAccessTrails, FLUSH_DELAY_MS);
}

/**
 * Saves the trails. The stored record is read again first and merged in, so
 * trails another window of the account saved meanwhile are kept and listed
 * here, while this window keeps its own current trail.
 */
function flushAccessTrails() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!isDirty || loadState !== "loaded") return;
  if (resolveNamespace() !== loadedNamespace) return;
  const generation = loadGeneration;
  isDirty = false;
  void Promise.resolve()
    .then(() => datafn.kv.get<AccessTrails>(Resource.accessTrails))
    .then((stored) => {
      if (generation !== loadGeneration) return undefined;
      const merged = mergeAccessTrails(
        get(trailsLocal),
        normalizeAccessTrails(stored)
      );
      trailsLocal.set(merged);
      return datafn.kv.set(Resource.accessTrails, merged);
    })
    .then((result) => {
      if (!result) return;
      if (result.ok) {
        if (generation === loadGeneration) failedFlushes = 0;
        return;
      }
      retryFlush(generation, result.error);
    })
    .catch((error) => retryFlush(generation, error));
}

/**
 * Keeps trails whose write failed dirty and schedules another write with a
 * capped backoff, unless the account changed since the write started.
 */
function retryFlush(generation: number, error: unknown) {
  logger.error({ at: "accessTrail.flush", error });
  if (generation !== loadGeneration) return;
  failedFlushes += 1;
  isDirty = true;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(
    flushAccessTrails,
    Math.min(FLUSH_RETRY_BASE_MS * 2 ** (failedFlushes - 1), FLUSH_RETRY_MAX_MS)
  );
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
  /** Makes a recent trail current again. */
  resume(key: string) {
    const at = Date.now();
    apply((trails) => resumeAccessTrail(trails, key, at));
  }
};

/** Number of resources in the current trail. */
export const accessTrailCount = derived(
  { subscribe: accessTrail.subscribe },
  (trails) => trails.current?.nodes.length ?? 0
);
