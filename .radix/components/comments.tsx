import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type Drawer = { open: boolean; target: Target | null };

type Store = {
  workspace: string;
  threads: Thread[];
  drawer: Drawer;
  openDrawer: (target?: Target | null, element?: Element) => void;
  closeDrawer: () => void;
  add: (target: Target | null, text: string) => void;
  reply: (thread: string, text: string) => void;
  resolve: (thread: string) => void;
};

const Context = createContext<Store | null>(null);

// Marks the element the drawer is open on, and the quoted text inside it, for
// as long as it stays open. See style.css.
function outline(element: Element | null, quote?: Quote) {
  document.querySelector("[data-rx-commenting]")?.removeAttribute("data-rx-commenting");
  element?.setAttribute("data-rx-commenting", "");

  const range = element && quote ? rangeOf(element, quote) : null;
  if (range) CSS.highlights.set("rx-commenting", new Highlight(range));
  else CSS.highlights.delete("rx-commenting");
}

// The part of an element's text a selection covers. Nothing if the selection
// is empty or reaches outside the element.
export function quoteOf(element: Element, range: Range | null): Quote | null {
  if (!range || range.collapsed || !element.contains(range.commonAncestorContainer)) return null;

  const text = range.toString();
  if (!text.trim()) return null;

  const before = document.createRange();
  before.setStart(element, 0);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;

  return { text, start, end: start + text.length };
}

// Finds a quote in an element again. If the text has changed since, it looks
// for the quoted text anywhere in the element, and gives up if it is gone.
function rangeOf(element: Element, quote: Quote): Range | null {
  const text = element.textContent ?? "";
  let start = quote.start;
  if (text.slice(quote.start, quote.end) !== quote.text) start = text.indexOf(quote.text);
  if (start < 0) return null;
  const end = start + quote.text.length;

  // Offsets count through the element's text nodes in order, which is how
  // textContent is built.
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let offset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = (node as Text).length;
    if (start >= offset && start <= offset + length) range.setStart(node, start - offset);
    if (end <= offset + length) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset += length;
  }
  return null;
}

function snippet(text: string) {
  const words = text.replace(/\s+/g, " ").trim();
  return words.length > 60 ? words.slice(0, 60).trimEnd() + "…" : words;
}

// A short piece of what a thread is on: the quoted text if there is some,
// otherwise what the component or block shows. Falls back to the id when the
// element is not on the page or has no text.
export function describe(component: string, quote?: Quote) {
  if (quote) return "“" + snippet(quote.text) + "”";

  const element = document.querySelector(`[data-rx-id="${component}"]`);
  const text = (element instanceof HTMLTextAreaElement ? element.value : element?.textContent) ?? "";
  return snippet(text) || component;
}

// `show` is a thread the inbox sent us here to look at. The drawer opens on
// what it is on, the way clicking a thread in the drawer would.
export function CommentsProvider({
  workspace,
  show,
  children,
}: {
  workspace: string;
  show?: { target: Target | null };
  children: React.ReactNode;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [drawer, setDrawer] = useState<Drawer>({ open: false, target: null });

  const load = useCallback(() => {
    radix.comments.read(workspace).then(setThreads);
  }, [workspace]);

  useEffect(load, [load]);

  useEffect(() => {
    return radix.subscribe((changed, file) => {
      if (changed === workspace && file === "comments.json") load();
    });
  }, [workspace, load]);

  // The inbox sends us here to look at one thread, so the drawer starts open
  // on what that thread is on. Scrolling to the block is left to the drawer,
  // where clicking the thread already does it: the workspace's own file is
  // still loading at this point, so the block is not on the page yet.
  useEffect(() => {
    if (show) setDrawer({ open: true, target: show.target });
  }, [show]);

  const announce = () => radix.changed(workspace, "comments.json");

  const store: Store = {
    workspace,
    threads,
    drawer,
    openDrawer: (target = null, element) => {
      outline(element ?? null, target?.quote);
      setDrawer({ open: true, target });
    },
    closeDrawer: () => {
      outline(null);
      setDrawer({ open: false, target: null });
    },
    // The watcher only reports the writes somebody else made, so a write from
    // here says so itself. That reloads the threads below, and tells anything
    // else showing comments, like the inbox.
    add: (target, text) => radix.comments.add(workspace, target, text).then(announce),
    reply: (thread, text) => radix.comments.reply(workspace, thread, text).then(announce),
    resolve: (thread) => radix.comments.resolve(workspace, thread).then(announce),
  };

  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useComments() {
  const store = useContext(Context);
  if (!store) throw new Error("no CommentsProvider above this component");
  return store;
}
