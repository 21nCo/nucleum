import { Resource } from "@nucleum/datafn/resource.enum";
import { determineResourceType } from "@nucleum/datafn/resource.utils";
import { Product } from "@nucleum/client/config/product.type";
import { productRegistry } from "@nucleum/schema/product.config";
import {
  decodeSpaceSegment,
  encodeSpaceSegment
} from "@nucleum/client/config/space-route";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { resolvePageRoute } from "@nucleum/shared-state/commands/page-view-actions";
import {
  SpaceNavItemType,
  type ISpaceHeading,
  type ISpaceNavItem,
  type ISpacePageNavItem,
  type ISpaceResourceNavItem,
  type SpaceDropPosition
} from "@nucleum/features/spaces/space.type";

function clone<T>(items: T[]): T[] {
  if (typeof structuredClone === "function") {
    return structuredClone(items ?? []);
  }
  return JSON.parse(JSON.stringify(items ?? []));
}

/** Deep-copies an item tree so callers can mutate the copy. */
export function cloneNavItems(items: ISpaceNavItem[] = []) {
  return clone(items);
}

function hoistRecordChildren(item: ISpaceNavItem): ISpaceNavItem[] {
  if (!item.children) return [item];
  const children = item.children.flatMap(hoistRecordChildren);
  if (item.type === SpaceNavItemType.SECTION) return [{ ...item, children }];
  const record = { ...item };
  delete record.children;
  return [record, ...children];
}

/**
 * Copies a saved item tree into the hierarchy spaces show, where only sections
 * hold children. Items nested under a record item, as combinations allowed,
 * follow that item as its siblings, so each of them keeps a row.
 */
export function normalizeNavItems(items: ISpaceNavItem[] = []) {
  return cloneNavItems(items).flatMap(hoistRecordChildren);
}

/** Returns the index path of an item, or null when it is not in the tree. */
export function findItemPath(
  items: ISpaceNavItem[],
  id: string,
  currentPath: number[] = []
): number[] | null {
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const path = [...currentPath, index];
    if (item.id === id) return path;
    if (item.children && item.children.length > 0) {
      const childPath = findItemPath(item.children, id, path);
      if (childPath) return childPath;
    }
  }
  return null;
}

/** Returns the item at an index path without modifying the tree. */
export function getItemByPath(
  items: ISpaceNavItem[],
  path: number[]
): ISpaceNavItem | undefined {
  if (path.length === 0) return undefined;
  let level: ISpaceNavItem[] | undefined = items;
  let current: ISpaceNavItem | undefined;
  for (const index of path) {
    current = level?.[index];
    if (!current) return undefined;
    level = current.children;
  }
  return current;
}

/** Finds an item anywhere in the tree. */
export function findItem(items: ISpaceNavItem[], id: string) {
  const path = findItemPath(items, id);
  return path ? getItemByPath(items, path) : undefined;
}

/** Returns the id of the section holding an item, or undefined at the root. */
export function findParentId(items: ISpaceNavItem[], id: string) {
  const path = findItemPath(items, id);
  if (!path || path.length < 2) return undefined;
  return getItemByPath(items, path.slice(0, -1))?.id;
}

function childrenAt(items: ISpaceNavItem[], parentPath: number[]) {
  if (parentPath.length === 0) return items;
  const parent = getItemByPath(items, parentPath);
  if (!parent) return undefined;
  parent.children = parent.children ?? [];
  return parent.children;
}

function isSection(item: ISpaceNavItem | undefined) {
  return item?.type === SpaceNavItemType.SECTION;
}

function containsId(item: ISpaceNavItem, id: string): boolean {
  if (item.id === id) return true;
  return (item.children ?? []).some((child) => containsId(child, id));
}

function insertAt(
  list: ISpaceNavItem[],
  item: ISpaceNavItem,
  index: number | undefined
) {
  const target =
    index === undefined || index < 0 || index > list.length
      ? list.length
      : index;
  list.splice(target, 0, item);
}

/**
 * Inserts an item at the root or inside a section. Returns the tree unchanged
 * when the parent is missing or is not a section.
 */
export function insertItem(
  items: ISpaceNavItem[],
  item: ISpaceNavItem,
  params: { parentId?: string; index?: number } = {}
) {
  const cloned = cloneNavItems(items);
  if (!params.parentId) {
    insertAt(cloned, item, params.index);
    return cloned;
  }
  const parentPath = findItemPath(cloned, params.parentId);
  if (!parentPath) return cloned;
  const parent = getItemByPath(cloned, parentPath);
  if (!isSection(parent)) return cloned;
  const list = childrenAt(cloned, parentPath);
  if (list) insertAt(list, item, params.index);
  return cloned;
}

/** Removes an item and its descendants. */
export function removeItemById(items: ISpaceNavItem[], id: string) {
  const cloned = cloneNavItems(items);
  const path = findItemPath(cloned, id);
  if (!path) return cloned;
  childrenAt(cloned, path.slice(0, -1))?.splice(path[path.length - 1], 1);
  return cloned;
}

function detach(items: ISpaceNavItem[], id: string) {
  const cloned = cloneNavItems(items);
  const path = findItemPath(cloned, id);
  if (!path) return { items: cloned, item: undefined };
  const [item] =
    childrenAt(cloned, path.slice(0, -1))?.splice(path[path.length - 1], 1) ??
    [];
  return { items: cloned, item };
}

/**
 * Moves an item before, after or inside a target. `inside` appends to a section and
 * falls back to `after` for other targets. Moving an item into itself or one of its
 * descendants leaves the tree unchanged.
 */
export function moveItemToPosition(
  items: ISpaceNavItem[],
  itemId: string,
  targetId: string,
  position: SpaceDropPosition
) {
  if (itemId === targetId) return items;
  const moving = findItem(items, itemId);
  if (!moving || containsId(moving, targetId)) return items;
  const { items: detached, item } = detach(items, itemId);
  if (!item) return items;
  const targetPath = findItemPath(detached, targetId);
  if (!targetPath) return items;
  const target = getItemByPath(detached, targetPath);
  if (position === "inside" && isSection(target)) {
    childrenAt(detached, targetPath)?.push(item);
    return detached;
  }
  const parentPath = targetPath.slice(0, -1);
  const targetIndex = targetPath[targetPath.length - 1];
  const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
  childrenAt(detached, parentPath)?.splice(insertIndex, 0, item);
  return detached;
}

/**
 * Moves an item to the root or into a section at an index of the destination list
 * after the item has been taken out. A missing index appends.
 */
export function moveItemToParent(
  items: ISpaceNavItem[],
  itemId: string,
  parentId: string | undefined,
  index?: number
) {
  const moving = findItem(items, itemId);
  if (!moving) return items;
  if (parentId && containsId(moving, parentId)) return items;
  const { items: detached, item } = detach(items, itemId);
  if (!item) return items;
  if (!parentId) {
    insertAt(detached, item, index);
    return detached;
  }
  const parentPath = findItemPath(detached, parentId);
  if (!parentPath || !isSection(getItemByPath(detached, parentPath)))
    return items;
  const list = childrenAt(detached, parentPath);
  if (!list) return items;
  insertAt(list, item, index);
  return detached;
}

/** Swaps an item with a sibling `offset` places away. */
export function moveItem(items: ISpaceNavItem[], id: string, offset: number) {
  if (!offset) return items;
  const cloned = cloneNavItems(items);
  const path = findItemPath(cloned, id);
  if (!path) return cloned;
  const list = childrenAt(cloned, path.slice(0, -1));
  if (!list) return cloned;
  const index = path[path.length - 1];
  const next = index + offset;
  if (next < 0 || next >= list.length) return cloned;
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);
  return cloned;
}

/** Moves an item to the end of the section directly above it. */
export function indentItem(items: ISpaceNavItem[], id: string) {
  const cloned = cloneNavItems(items);
  const path = findItemPath(cloned, id);
  if (!path) return cloned;
  const list = childrenAt(cloned, path.slice(0, -1));
  const index = path[path.length - 1];
  const previous = list?.[index - 1];
  if (!list || index <= 0 || !isSection(previous)) return cloned;
  const [item] = list.splice(index, 1);
  previous!.children = [...(previous!.children ?? []), item];
  return cloned;
}

/** Moves an item out of its section to just after that section. */
export function outdentItem(items: ISpaceNavItem[], id: string) {
  const cloned = cloneNavItems(items);
  const path = findItemPath(cloned, id);
  if (!path || path.length < 2) return cloned;
  const parentPath = path.slice(0, -1);
  const list = childrenAt(cloned, parentPath);
  const grandParent = childrenAt(cloned, parentPath.slice(0, -1));
  if (!list || !grandParent) return cloned;
  const [item] = list.splice(path[path.length - 1], 1);
  grandParent.splice(parentPath[parentPath.length - 1] + 1, 0, item);
  return cloned;
}

/** Renames an item. */
export function updateItemLabel(
  items: ISpaceNavItem[],
  id: string,
  label: string
) {
  const cloned = cloneNavItems(items);
  const path = findItemPath(cloned, id);
  const item = path ? getItemByPath(cloned, path) : undefined;
  if (item) item.label = label;
  return cloned;
}

/** Lists every item in tree order. */
export function flattenNavItems(items: ISpaceNavItem[] = []): ISpaceNavItem[] {
  const result: ISpaceNavItem[] = [];
  for (const item of items ?? []) {
    result.push(item);
    if (item.children?.length) result.push(...flattenNavItems(item.children));
  }
  return result;
}

/** Lists every record item in tree order. */
export function collectResourceItems(items: ISpaceNavItem[] = []) {
  return flattenNavItems(items).filter(
    (item): item is ISpaceResourceNavItem =>
      item.type === SpaceNavItemType.RESOURCE
  );
}

/** Lists every page link item in tree order. */
export function collectPageItems(items: ISpaceNavItem[] = []) {
  return flattenNavItems(items).filter(
    (item): item is ISpacePageNavItem => item.type === SpaceNavItemType.PAGE
  );
}

/** Trims surrounding slashes from a page path so equal paths compare equal. */
export function normalizeSpacePagePath(path: string) {
  return (path ?? "").trim().replace(/^\/+|\/+$/g, "");
}

/** A page link resolved against the current product's registered pages. */
export type SpacePageRoute = {
  /** The registered page or sub-view action that renders the path. */
  action: IAction;
  /** Label of a page or sub-view registered for exactly this path. */
  label?: string;
};

/**
 * Resolves a page link to the page that renders it: a page or sub-view registered
 * for exactly that path, otherwise a page that accepts any sub-path and whose
 * sub-path it is. Undefined when the product has no such page or sub-view.
 */
export function resolveSpacePageRoute(
  actions: IAction[],
  path: string
): SpacePageRoute | undefined {
  const target = normalizeSpacePagePath(path);
  if (!target) return undefined;
  const exact = (actions ?? []).find(
    (action) =>
      normalizeSpacePagePath(action.path ?? action.action ?? "") === target
  );
  if (exact) return { action: exact, label: exact.label };
  const route = resolvePageRoute(actions ?? [], target);
  return route?.action.isSubPathOpen ? { action: route.action } : undefined;
}

/** Status of a page link: unsupported when the current product has no such page. */
export function resolveSpacePageStatus(
  route: SpacePageRoute | undefined
): SpaceItemStatus | undefined {
  return route
    ? undefined
    : { kind: "unsupported", text: "Not available in this app" };
}

/** Counts sections and items that open something. */
export function countNavItems(items: ISpaceNavItem[] = []) {
  let sections = 0;
  let resources = 0;
  for (const item of flattenNavItems(items)) {
    if (item.type === SpaceNavItemType.SECTION) sections += 1;
    else resources += 1;
  }
  return { sections, resources };
}

/** Ids of the spaces placed directly in an item tree, at any section depth. */
export function collectChildSpaceIds(items: ISpaceNavItem[] = []) {
  return collectResourceItems(items)
    .filter((item) => item.resourceType === Resource.space)
    .map((item) => item.resourceId.toString());
}

/**
 * Returns true when `fromSpaceId` reaches `targetSpaceId` through nested spaces,
 * including when both are the same space.
 */
export function spaceReaches(
  fromSpaceId: string,
  targetSpaceId: string,
  childSpaceIds: (spaceId: string) => string[]
) {
  const visited = new Set<string>();
  const queue = [fromSpaceId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetSpaceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...childSpaceIds(current));
  }
  return false;
}

/**
 * Why a record cannot be added to a space, or undefined when it can. Without
 * `childSpaceIds` the space graph is unknown, so every other space is blocked.
 */
export function resolveAddBlockReason(params: {
  candidateId: string;
  currentSpaceId: string;
  focusChain: string[];
  items: ISpaceNavItem[];
  childSpaceIds: ((spaceId: string) => string[]) | undefined;
}): string | undefined {
  const { candidateId, currentSpaceId, focusChain, items, childSpaceIds } =
    params;
  if (candidateId === currentSpaceId) return "This is the current space";
  if (
    collectResourceItems(items).some(
      (item) => item.resourceId.toString() === candidateId
    )
  )
    return "Already in this space";
  if (determineResourceType(candidateId) !== Resource.space) return undefined;
  if (focusChain.includes(candidateId))
    return "Contains this space, adding it would create a loop";
  if (!childSpaceIds) return "Could not check this space for loops";
  if (spaceReaches(candidateId, currentSpaceId, childSpaceIds))
    return "Contains this space, adding it would create a loop";
  return undefined;
}

const spaceItemResourcesByProduct: Record<string, Resource[]> = {
  [Product.MEMOTRON]: [Resource.node, Resource.collection, Resource.space],
  [Product.NUCLEUM]: [
    Resource.node,
    Resource.collection,
    Resource.objective,
    Resource.space
  ],
  [Product.POINTRON]: [Resource.objective, Resource.space]
};

const openingProductPreference = [
  Product.MEMOTRON,
  Product.POINTRON,
  Product.NUCLEUM
];

/** Record types a product can add to and open from a space. */
export function resolveSpaceItemResources(product: Product): Resource[] {
  return spaceItemResourcesByProduct[product] ?? [Resource.space];
}

/** Whether a product can open a space item of this record type. */
export function isSpaceItemOpenable(resource: Resource, product: Product) {
  return resolveSpaceItemResources(product).includes(resource);
}

/** Name of another product that opens a record type, for unsupported items. */
export function resolveOpeningProductName(
  resource: Resource,
  product: Product
): string | undefined {
  const opener = openingProductPreference.find(
    (candidate) =>
      candidate !== product &&
      resolveSpaceItemResources(candidate).includes(resource)
  );
  return opener ? productRegistry[opener]?.displayName : undefined;
}

const headingQueryMetadata = {
  includeArchived: true,
  includeAncestorInactive: true
};

/**
 * DataFn queries for a Markdown page and its blocks in a space heading tree.
 * Archived pages stay openable from a space, so both queries include archived
 * records and blocks made inactive by an archived ancestor.
 */
export function resolveSpaceHeadingQueries(nodeId: string) {
  return {
    page: {
      filters: { id: nodeId },
      select: ["id", "mdChildOrder"],
      metadata: headingQueryMetadata
    },
    blocks: {
      filters: {
        $or: [{ parent: nodeId }, { parentPath: { $startsWith: `${nodeId}-` } }]
      },
      select: ["id", "label", "body", "contentType", "mdChildOrder"],
      metadata: headingQueryMetadata
    }
  };
}

/** Arranges headings into a tree where each heading holds the deeper ones after it. */
export function buildHeadingTree(
  headings: { id: string; label: string; level: number }[]
): ISpaceHeading[] {
  const roots: ISpaceHeading[] = [];
  const stack: ISpaceHeading[] = [];
  for (const heading of headings) {
    const node: ISpaceHeading = { ...heading, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

/** Parses a comma-separated focus parameter into space ids. */
export function parseFocusParam(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map(decodeSpaceSegment)
    .filter((id): id is string => Boolean(id));
}

/** Serializes a focus path for a search parameter, or null when empty. */
export function formatFocusParam(path: string[]) {
  return path.length > 0 ? path.map(encodeSpaceSegment).join(",") : null;
}

/**
 * Cuts a focus path at the first space that is already open above it, so a looped
 * path never renders.
 */
export function sanitizeFocusPath(rootId: string, path: string[]) {
  const seen = new Set([rootId]);
  const result: string[] = [];
  for (const id of path) {
    if (seen.has(id)) break;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Display label of an item's target record. Untitled pages fall back to their first
 * line of text so they stay recognizable in the side nav.
 */
export function resolveTargetLabel(record: {
  label?: unknown;
  name?: unknown;
  text?: unknown;
}) {
  for (const value of [record.label, record.name]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof record.text === "string") {
    const line = record.text
      .split("\n")
      .map((entry) => entry.trim())
      .find(Boolean);
    if (line) return line.length > 80 ? `${line.slice(0, 80)}...` : line;
  }
  return undefined;
}

/** Why a space item is shown greyed out, and the hint shown with it. */
export type SpaceItemStatus = {
  kind: "unsupported" | "loop" | "missing" | "trashed" | "archived";
  text: string;
};

/**
 * Status of a record item for the current product. Archived items keep opening;
 * every other status blocks the item.
 */
export function resolveSpaceItemStatus(params: {
  item: ISpaceResourceNavItem;
  product: Product;
  target?: { isArchived?: boolean; trashedAt?: unknown };
  isTargetsLoaded: boolean;
  loopIds: Set<string>;
}): SpaceItemStatus | undefined {
  const { item, product, target, isTargetsLoaded, loopIds } = params;
  if (!isSpaceItemOpenable(item.resourceType, product)) {
    const opener = resolveOpeningProductName(item.resourceType, product);
    return {
      kind: "unsupported",
      text: opener ? `Opens in ${opener}` : "Not available in this app"
    };
  }
  if (
    item.resourceType === Resource.space &&
    loopIds.has(item.resourceId.toString())
  )
    return { kind: "loop", text: "Already open above" };
  if (isTargetsLoaded && !target)
    return { kind: "missing", text: "Not available" };
  if (target?.trashedAt) return { kind: "trashed", text: "In trash" };
  if (target?.isArchived) return { kind: "archived", text: "Archived" };
  return undefined;
}

/** Whether a status keeps an item from opening. */
export function isSpaceItemBlocked(status: SpaceItemStatus | undefined) {
  return Boolean(status && status.kind !== "archived");
}
