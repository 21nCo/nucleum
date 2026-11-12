import {
  isItemNavigationKey,
  resolveItemNavigationIndex,
  resolveItemRange
} from "@21n/ui/actions/item-navigation";
import {
  isTextElement,
  resolveDialogOnFront,
  resolveModalOnFront
} from "@21n/ui/actions/interaction-dom";

/** Callbacks a list of items gives the keyboard highlight. */
export interface ItemNavigationConfig {
  /** Selector for the navigable items inside the node. */
  itemSelector: string;
  /** Opens a highlighted item on Enter; the event carries the modifiers. */
  onOpen?: (element: HTMLElement, event: KeyboardEvent) => void;
  /** Toggles bulk selection of a highlighted item on Space. */
  onToggle?: (element: HTMLElement) => void;
  /**
   * Extends bulk selection over a range on Shift+arrows. `isNewRange` is true
   * on the first press of a range, so the caller can keep what was selected
   * before it.
   */
  onExtend?: (
    elements: HTMLElement[],
    isNewRange: boolean,
    anchor: HTMLElement
  ) => void;
  /** Whether a bulk selection exists, which Escape clears before the highlight. */
  hasSelection?: () => boolean;
}

type ItemNavigationEntry = {
  node: HTMLElement;
  config: ItemNavigationConfig;
  highlightedKey: string | undefined;
  isShown: boolean;
  anchorKey: string | undefined;
  observer: MutationObserver;
};

const highlightAttribute = "data-item-highlighted";

/** Event dispatched on the highlighted item to ask it to open its menu. */
export const itemMenuEvent = "itemmenu";

function isMenuKey(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey) return false;
  if (event.key === "ContextMenu") return true;
  if (event.key === "F10") return event.shiftKey;
  return event.key === "." && !event.shiftKey;
}
const entries: ItemNavigationEntry[] = [];
let lastInteracted: ItemNavigationEntry | undefined;
let suppressedBy: Element | undefined;
let suppressedAt: string | undefined;
let isListening = false;

function resolveItems(entry: ItemNavigationEntry) {
  return Array.from(
    entry.node.querySelectorAll<HTMLElement>(entry.config.itemSelector)
  ).filter((element) => element.getClientRects().length > 0);
}

function resolveItemKey(element: HTMLElement) {
  return element.getAttribute("data-id") ?? element.id;
}

function isVisible(node: HTMLElement) {
  return node.isConnected && node.getClientRects().length > 0;
}

function hasOpenPopover() {
  return Array.from(document.querySelectorAll(".popover")).some(
    (element) =>
      !element.classList.contains("pointer-events-none") &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden"
  );
}

function resolveFrontLayer() {
  return resolveDialogOnFront() ?? resolveModalOnFront();
}

function isReachable(entry: ItemNavigationEntry, layer: Element | null) {
  if (!isVisible(entry.node)) return false;
  return layer ? layer.contains(entry.node) : true;
}

function resolveActiveEntry(): ItemNavigationEntry | undefined {
  const layer = resolveFrontLayer();
  if (
    suppressedBy?.isConnected &&
    suppressedBy.getClientRects().length > 0 &&
    suppressedAt === location.pathname
  )
    return undefined;
  suppressedBy = undefined;
  if (lastInteracted && isReachable(lastInteracted, layer))
    return lastInteracted;
  for (let index = entries.length - 1; index >= 0; index--) {
    if (isReachable(entries[index], layer)) return entries[index];
  }
  return undefined;
}

function paintHighlight(entry: ItemNavigationEntry) {
  const shownKey = entry.isShown ? entry.highlightedKey : undefined;
  for (const element of entry.node.querySelectorAll<HTMLElement>(
    `[${highlightAttribute}]`
  )) {
    if (resolveItemKey(element) === shownKey) continue;
    element.removeAttribute(highlightAttribute);
  }
  if (shownKey === undefined) return;
  const element = resolveItems(entry).find(
    (item) => resolveItemKey(item) === shownKey
  );
  if (!element || element.hasAttribute(highlightAttribute)) return;
  element.setAttribute(highlightAttribute, "true");
}

function clearHighlight(entry: ItemNavigationEntry) {
  entry.highlightedKey = undefined;
  entry.isShown = false;
  entry.anchorKey = undefined;
  paintHighlight(entry);
}

function isFocusOutside(entry: ItemNavigationEntry) {
  const active = document.activeElement;
  return (
    !!active &&
    active !== document.body &&
    active !== document.documentElement &&
    !entry.node.contains(active)
  );
}

function moveHighlight(
  entry: ItemNavigationEntry,
  event: KeyboardEvent,
  key: Parameters<typeof resolveItemNavigationIndex>[2]
) {
  const items = resolveItems(entry);
  const currentIndex = items.findIndex(
    (item) => resolveItemKey(item) === entry.highlightedKey
  );
  const nextIndex = resolveItemNavigationIndex(
    items.map((item) => item.getBoundingClientRect()),
    currentIndex < 0 ? undefined : currentIndex,
    key
  );
  if (nextIndex === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  const next = items[nextIndex];
  if (event.shiftKey && entry.config.onExtend) {
    const isNewRange =
      entry.anchorKey === undefined ||
      !items.some((item) => resolveItemKey(item) === entry.anchorKey);
    if (isNewRange)
      entry.anchorKey = resolveItemKey(items[Math.max(0, currentIndex)]);
    const anchorIndex = items.findIndex(
      (item) => resolveItemKey(item) === entry.anchorKey
    );
    entry.config.onExtend(
      resolveItemRange(anchorIndex, nextIndex).map((index) => items[index]),
      isNewRange,
      items[anchorIndex]
    );
  } else {
    entry.anchorKey = undefined;
  }
  entry.highlightedKey = resolveItemKey(next);
  entry.isShown = true;
  paintHighlight(entry);
  next.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function resolveHighlighted(entry: ItemNavigationEntry) {
  if (!entry.isShown || entry.highlightedKey === undefined) return undefined;
  return resolveItems(entry).find(
    (item) => resolveItemKey(item) === entry.highlightedKey
  );
}

function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey) return;
  if (isTextElement(event.target) || hasOpenPopover()) return;
  const entry = resolveActiveEntry();
  if (!entry || isFocusOutside(entry)) return;
  if (isItemNavigationKey(event.key)) {
    if (event.metaKey || event.ctrlKey) return;
    moveHighlight(entry, event, event.key);
    return;
  }
  if (event.key === "Escape") {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (entry.config.hasSelection?.()) {
      entry.anchorKey = undefined;
      return;
    }
    if (!entry.isShown) return;
    clearHighlight(entry);
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const highlighted = resolveHighlighted(entry);
  if (!highlighted) return;
  if (isMenuKey(event)) {
    event.preventDefault();
    event.stopPropagation();
    highlighted.dispatchEvent(new CustomEvent(itemMenuEvent));
    return;
  }
  if (event.key === "Enter" && !event.shiftKey && entry.config.onOpen) {
    event.preventDefault();
    event.stopPropagation();
    entry.isShown = false;
    paintHighlight(entry);
    entry.config.onOpen(highlighted, event);
    return;
  }
  if (
    event.key === " " &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    entry.config.onToggle
  ) {
    event.preventDefault();
    event.stopPropagation();
    entry.anchorKey = undefined;
    entry.config.onToggle(highlighted);
  }
}

function isScrollable(element: Element) {
  const style = getComputedStyle(element);
  return (
    /(auto|scroll)/.test(style.overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  );
}

/**
 * Returns the nearest scrolling area around a pointer target that holds no
 * list, so arrow keys keep scrolling it after a click inside.
 */
function resolveOtherScrollArea(target: Node) {
  let element = target instanceof Element ? target : target.parentElement;
  while (element && element !== document.body) {
    const holdsList = entries.some((entry) => element!.contains(entry.node));
    if (holdsList) return undefined;
    if (isScrollable(element)) return element;
    element = element.parentElement;
  }
  return undefined;
}

function onPointerDown(event: PointerEvent) {
  if (!(event.target instanceof Node)) return;
  const target = event.target;
  const entry = entries.find((candidate) => candidate.node.contains(target));
  if (!entry) {
    const area = resolveOtherScrollArea(target);
    if (area) {
      suppressedBy = area;
      suppressedAt = location.pathname;
    }
    return;
  }
  suppressedBy = undefined;
  lastInteracted = entry;
  clearHighlight(entry);
}

function startListening() {
  if (isListening) return;
  isListening = true;
  window.addEventListener("keydown", onKeydown, true);
  window.addEventListener("pointerdown", onPointerDown, true);
}

function stopListening() {
  if (!isListening || entries.length > 0) return;
  isListening = false;
  window.removeEventListener("keydown", onKeydown, true);
  window.removeEventListener("pointerdown", onPointerDown, true);
}

/**
 * Moves a keyboard highlight between the items of a list or grid with the
 * plain arrow keys. Left and Right move within a row, Up and Down across rows.
 * Enter opens the highlighted item and hides the highlight until the next
 * arrow, which resumes from that item. Space toggles its selection, Shift+arrows
 * extend the selection, and the period, ContextMenu or Shift+F10 key dispatches
 * `itemmenu` on the item so it can open its menu. Escape clears the highlight once no selection is
 * left. Only the list the user last clicked in, or else the most recently
 * mounted visible list, responds, and lists behind a modal or dialog do not.
 * A click inside another scrolling area keeps the arrow keys for that area
 * until a list is clicked or mounted, the area closes, or the page path changes.
 */
export function itemNavigation(
  node: HTMLElement,
  config: ItemNavigationConfig
) {
  const entry: ItemNavigationEntry = {
    node,
    config,
    highlightedKey: undefined,
    isShown: false,
    anchorKey: undefined,
    observer: new MutationObserver(() => {
      if (entry.isShown) paintHighlight(entry);
    })
  };
  entry.observer.observe(node, { childList: true, subtree: true });
  entries.push(entry);
  suppressedBy = undefined;
  startListening();
  return {
    update(nextConfig: ItemNavigationConfig) {
      entry.config = nextConfig;
    },
    destroy() {
      entry.observer.disconnect();
      clearHighlight(entry);
      entries.splice(entries.indexOf(entry), 1);
      if (lastInteracted === entry) lastInteracted = undefined;
      stopListening();
    }
  };
}
