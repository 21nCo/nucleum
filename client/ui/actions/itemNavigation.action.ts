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
  onExtend?: (elements: HTMLElement[], isNewRange: boolean) => void;
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
const highlightClasses = [
  "outline",
  "outline-2",
  "outline-aps1",
  "outline-offset-2",
  "rounded-md"
];
const entries: ItemNavigationEntry[] = [];
let lastInteracted: ItemNavigationEntry | undefined;
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
    element.classList.remove(...highlightClasses);
  }
  if (shownKey === undefined) return;
  const element = resolveItems(entry).find(
    (item) => resolveItemKey(item) === shownKey
  );
  if (!element || element.hasAttribute(highlightAttribute)) return;
  element.setAttribute(highlightAttribute, "true");
  element.classList.add(...highlightClasses);
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
      isNewRange
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
    if (entry.config.hasSelection?.()) return;
    if (!entry.isShown) return;
    clearHighlight(entry);
    event.preventDefault();
    return;
  }
  const highlighted = resolveHighlighted(entry);
  if (!highlighted) return;
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
    entry.anchorKey = resolveItemKey(highlighted);
    entry.config.onToggle(highlighted);
  }
}

function onPointerDown(event: PointerEvent) {
  const entry = entries.find(
    (candidate) =>
      event.target instanceof Node && candidate.node.contains(event.target)
  );
  if (!entry) return;
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
 * extend the selection, and Escape clears the highlight once no selection is
 * left. Only the list the user last clicked in, or else the most recently
 * mounted visible list, responds, and lists behind a modal or dialog do not.
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
