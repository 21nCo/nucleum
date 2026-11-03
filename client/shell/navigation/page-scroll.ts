/** Scroll offset of one scrolled element, addressed by child indices from the layer root. */
export type SavedScroll = {
  path: number[];
  top: number;
};

const RESTORE_TIMEOUT_MS = 4000;
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

/** Reads the scroll offsets of every scrolled element below `root`. */
export function readScrolls(root: Element): SavedScroll[] {
  const scrolls: SavedScroll[] = [];
  root.querySelectorAll("*").forEach((element) => {
    if (element.scrollTop <= 0) return;
    const path = pathFrom(root, element);
    if (path) scrolls.push({ path, top: element.scrollTop });
  });
  return scrolls;
}

/** Remembers the scroll position of the resource page rendered in `root`. */
export function savePageScroll(root: Element | undefined, id: string) {
  if (!root) return;
  const scrolls = readScrolls(root);
  if (scrolls.length > 0) savedScrolls.set(id, scrolls);
  else savedScrolls.delete(id);
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
