/**
 * One resource opened in a trail; `key` identifies the node itself, which stays
 * stable while the trail is kept, and `parent` is the index of the node it was
 * opened from, or -1 for the root.
 */
export type AccessTrailNode = {
  id: string;
  key: string;
  parent: number;
};

/** Keys a trail change uses for a trail or node it creates. */
export type AccessTrailStamp = {
  key: string;
  nodeKey: string;
  at: number;
};

/** Resources opened from one fresh open, kept as a tree of followed links. */
export type AccessTrail = {
  key: string;
  origin?: string;
  nodes: AccessTrailNode[];
  active: number;
  startedAt: number;
  updatedAt: number;
};

/** Versioned trail document stored in DataFn KV: the current trail and earlier trails, newest first. */
export type AccessTrails = {
  version: typeof ACCESS_TRAILS_VERSION;
  current?: AccessTrail;
  recent: AccessTrail[];
};

/** A trail node with its tree depth, in depth-first order. */
export type AccessTrailRow = {
  index: number;
  id: string;
  depth: number;
};

export const ACCESS_TRAILS_VERSION = 1;
export const ACCESS_TRAIL_RECENT_LIMIT = 10;
export const ACCESS_TRAIL_NODE_LIMIT = 100;

/** Creates an empty trail document. */
export function createAccessTrails(): AccessTrails {
  return { version: ACCESS_TRAILS_VERSION, recent: [] };
}

/** Reads a stored value into a valid trail document, discarding malformed trails. */
export function normalizeAccessTrails(value: unknown): AccessTrails {
  const trails = createAccessTrails();
  if (!isObject(value) || value.version !== ACCESS_TRAILS_VERSION) {
    return trails;
  }
  const current = normalizeTrail(value.current);
  const recent = Array.isArray(value.recent)
    ? value.recent
        .map(normalizeTrail)
        .filter((trail): trail is AccessTrail => !!trail)
        .reduceRight(addRecentAccessTrail, [] as AccessTrail[])
    : [];
  return { ...trails, ...(current ? { current } : {}), recent };
}

/** Archives the current trail and starts a new one rooted at `id`. */
export function startAccessTrail(
  trails: AccessTrails,
  id: string,
  options: AccessTrailStamp & { origin?: string }
): AccessTrails {
  const archived = endAccessTrail(trails);
  return {
    ...archived,
    current: {
      key: options.key,
      ...(options.origin ? { origin: options.origin } : {}),
      nodes: [{ id, key: options.nodeKey, parent: -1 }],
      active: 0,
      startedAt: options.at,
      updatedAt: options.at
    }
  };
}

/**
 * Records `id` as opened from the active node. An existing child with the same
 * id is reused, so following the same link twice does not duplicate it; going
 * back and following a different link starts a branch.
 */
export function extendAccessTrail(
  trails: AccessTrails,
  id: string,
  options: AccessTrailStamp
): AccessTrails {
  const trail = trails.current;
  if (!trail) return startAccessTrail(trails, id, options);
  const active = trail.nodes[trail.active];
  if (active?.id === id) return trails;
  const childIndex = trail.nodes.findIndex(
    (node) => node.parent === trail.active && node.id === id
  );
  if (childIndex > -1)
    return activateAccessTrailNode(trails, childIndex, options.at);
  if (trail.nodes.length >= ACCESS_TRAIL_NODE_LIMIT) {
    return startAccessTrail(trails, id, options);
  }
  return {
    ...trails,
    current: {
      ...trail,
      nodes: [
        ...trail.nodes,
        { id, key: options.nodeKey, parent: trail.active }
      ],
      active: trail.nodes.length,
      updatedAt: options.at
    }
  };
}

/** Makes the node at `index` of the current trail the active one. */
export function activateAccessTrailNode(
  trails: AccessTrails,
  index: number,
  at: number
): AccessTrails {
  const trail = trails.current;
  if (!trail || !trail.nodes[index] || trail.active === index) return trails;
  return { ...trails, current: { ...trail, active: index, updatedAt: at } };
}

/** Index of the node the active node was opened from, if any. */
export function resolveAccessTrailParent(trail: AccessTrail | undefined) {
  if (!trail) return undefined;
  const parent = trail.nodes[trail.active]?.parent;
  return parent !== undefined && parent > -1 ? parent : undefined;
}

/** Trail node a history entry shows: the trail key and the node's own key. */
export type AccessTrailPosition = {
  trail: string;
  node: string;
};

/** Position of the active node of the current trail, if any. */
export function resolveAccessTrailPosition(
  trails: AccessTrails
): AccessTrailPosition | undefined {
  const trail = trails.current;
  const node = trail?.nodes[trail.active];
  return trail && node ? { trail: trail.key, node: node.key } : undefined;
}

/** Whether two positions name the same trail node. */
export function isSameAccessTrailPosition(
  a: AccessTrailPosition | undefined,
  b: AccessTrailPosition | undefined
) {
  return !!a && !!b && a.trail === b.trail && a.node === b.node;
}

/**
 * Follows the open page after a navigation the trail did not start itself,
 * such as browser back and forward. The `position` recorded in the history
 * entry selects that exact node, resuming its trail when it was archived.
 * Entries without a position, such as the first page after a reload, follow
 * the page by its resource. Closing the page archives the trail; a page
 * outside the trails starts a new one.
 */
export function syncAccessTrailPage(
  trails: AccessTrails,
  pageId: string | undefined,
  options: AccessTrailStamp & { position?: AccessTrailPosition }
): AccessTrails {
  if (!pageId) return endAccessTrail(trails);
  const position = options.position;
  if (position) {
    const isCurrent = trails.current?.key === position.trail;
    const owner = isCurrent
      ? trails.current
      : trails.recent.find((item) => item.key === position.trail);
    const index =
      owner?.nodes.findIndex(
        (node) => node.key === position.node && node.id === pageId
      ) ?? -1;
    if (index > -1) {
      const resumed = isCurrent
        ? trails
        : resumeAccessTrail(trails, position.trail, options.at);
      return activateAccessTrailNode(resumed, index, options.at);
    }
  }
  const trail = trails.current;
  if (!trail) return startAccessTrail(trails, pageId, options);
  if (trail.nodes[trail.active]?.id === pageId) return trails;
  const parent = resolveAccessTrailParent(trail);
  if (parent !== undefined && trail.nodes[parent].id === pageId) {
    return activateAccessTrailNode(trails, parent, options.at);
  }
  const child = trail.nodes.findIndex(
    (node) => node.parent === trail.active && node.id === pageId
  );
  if (child > -1) return activateAccessTrailNode(trails, child, options.at);
  const any = trail.nodes.findIndex((node) => node.id === pageId);
  if (any > -1) return activateAccessTrailNode(trails, any, options.at);
  return startAccessTrail(trails, pageId, options);
}

/** Moves the current trail to the front of the recent trails. */
export function endAccessTrail(trails: AccessTrails): AccessTrails {
  const trail = trails.current;
  if (!trail) return trails;
  return {
    version: ACCESS_TRAILS_VERSION,
    recent: addRecentAccessTrail(trails.recent, trail)
  };
}

/** Whether two trails start at the same resource and contain the same resources. */
export function isSameAccessTrail(a: AccessTrail, b: AccessTrail) {
  if (a.nodes[0]?.id !== b.nodes[0]?.id) return false;
  const left = new Set(a.nodes.map((node) => node.id));
  const right = new Set(b.nodes.map((node) => node.id));
  return left.size === right.size && [...left].every((id) => right.has(id));
}

/**
 * Puts a finished trail at the front of the recent trails. A trail with a
 * single resource is not kept, since Recently accessed already lists it, and a
 * trail matching an earlier one replaces it instead of adding a duplicate.
 */
export function addRecentAccessTrail(
  recent: AccessTrail[],
  trail: AccessTrail
): AccessTrail[] {
  const others = recent.filter(
    (item) => item.key !== trail.key && !isSameAccessTrail(item, trail)
  );
  if (new Set(trail.nodes.map((node) => node.id)).size < 2) return others;
  return [trail, ...others].slice(0, ACCESS_TRAIL_RECENT_LIMIT);
}

/** Makes a recent trail current again, archiving the trail it replaces. */
export function resumeAccessTrail(
  trails: AccessTrails,
  key: string,
  at: number
): AccessTrails {
  const trail = trails.recent.find((item) => item.key === key);
  if (!trail) return trails;
  const archived = endAccessTrail(trails);
  return {
    ...archived,
    current: { ...trail, updatedAt: at },
    recent: archived.recent.filter((item) => item.key !== key)
  };
}

/** Removes a recent trail. */
export function removeRecentAccessTrail(
  trails: AccessTrails,
  key: string
): AccessTrails {
  return {
    ...trails,
    recent: trails.recent.filter((item) => item.key !== key)
  };
}

/** Lists trail nodes depth first, children in the order they were opened. */
export function flattenAccessTrail(trail: AccessTrail): AccessTrailRow[] {
  const rows: AccessTrailRow[] = [];
  const visit = (parent: number, depth: number) => {
    trail.nodes.forEach((node, index) => {
      if (node.parent !== parent) return;
      rows.push({ index, id: node.id, depth });
      visit(index, depth + 1);
    });
  };
  visit(-1, 0);
  return rows;
}

function normalizeTrail(value: unknown): AccessTrail | undefined {
  if (!isObject(value) || typeof value.key !== "string") return undefined;
  if (!Array.isArray(value.nodes)) return undefined;
  const nodes: AccessTrailNode[] = [];
  for (const node of value.nodes) {
    if (!isObject(node) || typeof node.id !== "string") return undefined;
    const parent = Number.isInteger(node.parent) ? (node.parent as number) : -1;
    if (parent >= nodes.length || (nodes.length > 0 && parent < 0)) {
      return undefined;
    }
    nodes.push({
      id: node.id,
      key:
        typeof node.key === "string" && node.key
          ? node.key
          : `${value.key}:${nodes.length}`,
      parent: nodes.length === 0 ? -1 : parent
    });
  }
  if (nodes.length === 0) return undefined;
  const active =
    Number.isInteger(value.active) && nodes[value.active as number]
      ? (value.active as number)
      : 0;
  const startedAt = Number.isFinite(value.startedAt)
    ? (value.startedAt as number)
    : 0;
  return {
    key: value.key,
    ...(typeof value.origin === "string" ? { origin: value.origin } : {}),
    nodes,
    active,
    startedAt,
    updatedAt: Number.isFinite(value.updatedAt)
      ? (value.updatedAt as number)
      : startedAt
  };
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
