import React, { useEffect, useRef, useState } from "react";

import { Icon } from "./Icon.tsx";

// The blocks of a workspace, as the Babel plugin in the loader marks them.
const BLOCKS = "[data-rx-id], [data-rx-source]";

// What the page said the last time it was left: the text of each block, in
// order. Kept in local storage, since it is about one reader and not the page.
type Seen = { at: string; blocks: string[] };

function key(workspace: string) {
  return "radix.seen." + workspace;
}

function readSeen(workspace: string): Seen | null {
  try {
    return JSON.parse(localStorage.getItem(key(workspace)) ?? "null");
  } catch {
    return null;
  }
}

function writeSeen(workspace: string, blocks: string[]) {
  try {
    localStorage.setItem(key(workspace), JSON.stringify({ at: new Date().toISOString(), blocks }));
  } catch {}
}

// Only blocks with no block inside them are compared, so a change is marked
// once, on the element that holds it.
function blocksIn(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(BLOCKS)].filter((element) => !element.querySelector(BLOCKS));
}

// Which items of `before` and `after` are the same, as pairs of indexes in
// order. The longest common subsequence, so a block added near the top does
// not make everything below it look changed.
function common(before: string[], after: string[]) {
  const n = before.length;
  const m = after.length;
  const lengths = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lengths[i][j] =
        before[i] === after[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

// How alike two texts are, from 0 to 1, by the words they share.
function similarity(a: string, b: string) {
  const words = new Set(a.split(/\s+/));
  const other = b.split(/\s+/);
  const shared = other.filter((word) => words.has(word)).length;
  return shared / Math.max(words.size, other.length);
}

// A block that differs from what was seen. `was` is the old block it is an
// edit of, if there is one.
type Change = { index: number; was: string | null };

function compare(before: string[], after: string[]) {
  const changes: Change[] = [];
  let removed = 0;
  let i = 0;
  let j = 0;

  // Between two blocks that match, each new block is paired with the most
  // alike old block that comes after the last one paired, if any is alike
  // enough. A new block with no pair was added, and an old one was removed.
  for (const [nextI, nextJ] of [...common(before, after), [before.length, after.length]]) {
    let from = i;
    for (let k = j; k < nextJ; k++) {
      let best = -1;
      let score = 0.5;
      for (let o = from; o < nextI; o++) {
        const alike = similarity(before[o], after[k]);
        if (alike >= score) {
          best = o;
          score = alike;
        }
      }
      changes.push({ index: k, was: best < 0 ? null : before[best] });
      if (best >= 0) {
        removed += best - from;
        from = best + 1;
      }
    }
    removed += nextI - from;
    i = nextI + 1;
    j = nextJ + 1;
  }
  return { changes, removed };
}

// Where two texts start and stop differing, widened to whole words. Good
// enough to point at an edit: it compares from both ends and takes the middle.
function differing(before: string, after: string) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }

  while (start > 0 && after[start - 1] !== " ") start--;
  while (end > 0 && after[after.length - end] !== " ") end--;

  return {
    added: [start, after.length - end] as const,
    removed: before.slice(start, before.length - end).trim(),
  };
}

// A range over characters `from` to `to` of an element's text, which may run
// across several text nodes.
function rangeIn(element: HTMLElement, from: number, to: number) {
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent!.length;
    if (!started && from <= offset + length) {
      range.setStart(node, from - offset);
      started = true;
    }
    if (started && to <= offset + length) {
      range.setEnd(node, to - offset);
      return range;
    }
    offset += length;
  }
  return null;
}

// Changed blocks get a line beside them, the words that were put in
// highlighted, and the words that were taken out below them. All of it is done with
// attributes and CSS highlights, which leave the elements React owns alone.
function mark(elements: HTMLElement[], texts: string[], changes: Change[]) {
  for (const element of document.querySelectorAll("[data-rx-changed]")) {
    element.removeAttribute("data-rx-changed");
    element.removeAttribute("data-rx-was");
  }

  const ranges: Range[] = [];
  for (const { index, was } of changes) {
    const element = elements[index];
    element.setAttribute("data-rx-changed", "");
    if (was === null) continue;

    const { added, removed } = differing(was, texts[index]);
    if (removed) element.setAttribute("data-rx-was", removed);
    const range = added[0] < added[1] ? rangeIn(element, added[0], added[1]) : null;
    if (range) ranges.push(range);
  }

  if ("highlights" in CSS) CSS.highlights.set("rx-added", new Highlight(...ranges));
}

function clear() {
  mark([], [], []);
  if ("highlights" in CSS) CSS.highlights.delete("rx-added");
}

// Flashes blocks whose text has just changed.
function flash(elements: HTMLElement[]) {
  for (const element of elements) {
    element.removeAttribute("data-rx-flash");
    // Reading layout restarts the animation on a block that is still flashing.
    void element.offsetWidth;
    element.setAttribute("data-rx-flash", "");
    setTimeout(() => element.removeAttribute("data-rx-flash"), 1600);
  }
}

function when(at: string) {
  const date = new Date(at);
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + time;
}

function plural(count: number, word: string) {
  return count + " " + word + (count === 1 ? "" : "s");
}

// Wraps the open workspace and marks what has changed since it was last left.
// The page is compared again whenever its text changes, and blocks that change
// while it is open flash if the change came from outside the window.
export function Changes({ workspace, children }: { workspace: string; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(() => readSeen(workspace));
  const [counts, setCounts] = useState({ changed: 0, removed: 0 });

  // The text of each block the last time the page was read, which is what is
  // saved on leaving.
  const latest = useRef<string[]>([]);

  useEffect(() => {
    let timer = 0;
    let edited = false;

    const scan = () => {
      const elements = blocksIn(root.current!);
      const texts = elements.map((element) => element.textContent ?? "");
      // The workspace has not been drawn yet.
      if (elements.length === 0) return;

      if (edited && latest.current.length > 0) {
        const { changes } = compare(latest.current, texts);
        flash(changes.map((change) => elements[change.index]));
        edited = false;
      }
      latest.current = texts;

      // A workspace that has never been left has nothing to compare with, so
      // the page as it first appears is what was seen. Edits made while it is
      // open are then marked like any other.
      if (!seen) {
        setSeen({ at: new Date().toISOString(), blocks: texts });
        return;
      }
      const { changes, removed } = compare(seen.blocks, texts);
      mark(elements, texts, changes);
      setCounts({ changed: changes.length, removed });
    };

    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 150);
    });
    observer.observe(root.current!, { childList: true, subtree: true, characterData: true });
    scan();

    // Only writes made outside the window are reported, so these are the
    // agent's. Opening a workspace writes its metadata, which is not an edit.
    const unsubscribe = radix.subscribe((changed, file) => {
      if (changed === workspace && (file === "Workspace.tsx" || file === "state.json")) edited = true;
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      unsubscribe();
      clear();
    };
  }, [workspace, seen]);

  // Leaving the workspace, or closing the window, counts as having seen it.
  useEffect(() => {
    const leave = () => {
      if (latest.current.length > 0) writeSeen(workspace, latest.current);
    };
    addEventListener("pagehide", leave);
    return () => {
      removeEventListener("pagehide", leave);
      leave();
    };
  }, [workspace]);

  const markSeen = () => {
    writeSeen(workspace, latest.current);
    setSeen(readSeen(workspace));
  };

  const total = counts.changed + counts.removed;
  const parts = [
    counts.changed > 0 && plural(counts.changed, "block") + " changed",
    counts.removed > 0 && (counts.changed > 0 ? counts.removed + " removed" : plural(counts.removed, "block") + " removed"),
  ].filter(Boolean);

  return (
    <>
      {seen && total > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5 text-xs">
          <Icon name="git-compare" className="size-3.5" />
          {parts.join(" and ")} since {when(seen.at)}.
          <button className="ml-auto underline underline-offset-2" onClick={markSeen}>
            Mark as seen
          </button>
        </div>
      )}
      <div ref={root}>{children}</div>
    </>
  );
}
