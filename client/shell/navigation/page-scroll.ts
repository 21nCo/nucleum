/** Scroll offset of one scrolled element, addressed by child indices from the layer root. */
export type SavedScroll = {
  path: number[];
  top: number;
};

const RESTORE_TIMEOUT_MS = 4000;
const SAVED_PAGE_LIMIT = 50;
const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"];
const savedScrolls = new Map<string, SavedScroll[]>();

function pathFrom(root: Element, element: Element) {
  const path: number[] = [];
  let node: Element | null = element;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return undefined;
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
    node = parent;
  }
  return node === root ? path : undefined;
}

function resolvePath(root: Element, path: number[]) {
  let node: Element | undefined = root;
  for (const index of path) {
    node = node?.children[index];
    if (!node) return undefined;
  }
  return node;
}

/**
 * Remembers the scroll offset of `element`, scrolled inside the resource page
 * of `id` rendered in `root`. Only the scrolled element is read, at the time
 * of its scroll event. The most recently scrolled pages are kept.
 */
export function savePageScroll(
  root: Element | undefined,
  id: string,
  element: EventTarget | null
) {
  if (!root || !(element instanceof Element)) return;
  const path = pathFrom(root, element);
  if (!path) return;
  const key = path.join("/");
  const others = (savedScrolls.get(id) ?? []).filter(
    (scroll) => scroll.path.join("/") !== key
  );
  const scrolls =
    element.scrollTop > 0
      ? [...others, { path, top: element.scrollTop }]
      : others;
  savedScrolls.delete(id);
  if (scrolls.length === 0) return;
  savedScrolls.set(id, scrolls);
  if (savedScrolls.size > SAVED_PAGE_LIMIT) {
    const oldest = savedScrolls.keys().next().value;
    if (oldest !== undefined) savedScrolls.delete(oldest);
  }
}

/** Forgets the scroll position of `id`, so its next open starts at the top. */
export function forgetPageScroll(id: string) {
  savedScrolls.delete(id);
}

/**
 * Restores the remembered scroll position of `id` while the resource renders
 * from local data. Content that re-renders during the first moments gets the
 * position again; scrolling by the user ends the restore. Returns a function
 * that stops it.
 */
export function restorePageScroll(root: Element | undefined, id: string) {
  const scrolls = savedScrolls.get(id);
  if (!root || !scrolls) return () => {};
  let frame = 0;
  let isStopped = false;
  const startedAt = Date.now();
  const stop = () => {
    isStopped = true;
    cancelAnimationFrame(frame);
    userEvents.forEach((name) => root.removeEventListener(name, stop));
  };
  const step = () => {
    if (isStopped) return;
    scrolls.forEach((scroll) => {
      const element = resolvePath(root, scroll.path);
      if (!element || Math.abs(element.scrollTop - scroll.top) < 1) return;
      if (element.scrollHeight - element.clientHeight < scroll.top - 1) return;
      element.scrollTop = scroll.top;
    });
    if (Date.now() - startedAt < RESTORE_TIMEOUT_MS) {
      frame = requestAnimationFrame(step);
    } else {
      stop();
    }
  };
  userEvents.forEach((name) =>
    root.addEventListener(name, stop, { passive: true })
  );
  frame = requestAnimationFrame(step);
  return stop;
}

/**
 * Svelte action for the element that renders the resource page `id`: saves
 * the scroll of anything scrolled inside it and restores the remembered
 * position whenever another page renders there, so going back to a page
 * returns to where it was read.
 */
export function pageScroll(node: HTMLElement, id: string | undefined) {
  let renderedId: string | undefined;
  let stopRestore = () => {};
  const onScroll = (event: Event) => {
    if (!renderedId) return;
    savePageScroll(node, renderedId, event.target);
  };
  const render = (next: string | undefined) => {
    if (next === renderedId) return;
    stopRestore();
    stopRestore = () => {};
    renderedId = next;
    if (next) stopRestore = restorePageScroll(node, next);
  };
  node.addEventListener("scroll", onScroll, { capture: true, passive: true });
  render(id);
  return {
    update: render,
    destroy() {
      stopRestore();
      node.removeEventListener("scroll", onScroll, { capture: true });
    }
  };
}
