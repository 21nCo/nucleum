import { derived, get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { datafn } from "@nucleum/datafn/datafn.store";
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
  type AccessTrails
} from "@nucleum/shell/navigator/access-trail";

const FLUSH_DELAY_MS = 1000;

type TrailChange = (trails: AccessTrails) => AccessTrails;

const trailsLocal = writable<AccessTrails>(createAccessTrails());
let loadState: "idle" | "loading" | "loaded" = "idle";
let queued: TrailChange[] = [];
let isDirty = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function ensureLoaded() {
  if (loadState !== "idle") return;
  loadState = "loading";
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
    apply((trails) => startAccessTrail(trails, id, { ...stamp(), origin }));
  },
  /** Records `id` as opened from the active resource of the current trail. */
  extend(id: string) {
    apply((trails) => extendAccessTrail(trails, id, stamp()));
  },
  /** Activates a node of the current trail. */
  select(index: number) {
    apply((trails) => activateAccessTrailNode(trails, index, Date.now()));
  },
  /** Follows the open page after browser navigation; undefined ends the trail. */
  sync(pageId: string | undefined) {
    apply((trails) => syncAccessTrailPage(trails, pageId, stamp()));
  },
  /** Keeps the current trail as a recent trail. */
  end() {
    apply(endAccessTrail);
  },
  /** Makes a recent trail current again. */
  resume(key: string) {
    apply((trails) => resumeAccessTrail(trails, key, Date.now()));
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
