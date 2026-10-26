import React, { useState } from "react";

import { Button } from "./ui/button.tsx";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "./ui/sidebar.tsx";
import { Autosize } from "./textarea.tsx";
import { Icon } from "./Icon.tsx";
import { describe, useComments } from "./comments.tsx";
import { useAction } from "./actions.tsx";

// Enter sends, Shift+Enter makes a newline.
function Composer({ label, onSubmit }: { label: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  const keyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <Autosize
      className="text-xs"
      value={text}
      placeholder={label}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={keyDown}
    />
  );
}

function ThreadView({ thread }: { thread: Thread }) {
  const { reply, resolve, openDrawer } = useComments();

  // Scrolls to what the thread is on and highlights it, as if it had been
  // right-clicked and commented on. A workspace thread has nothing to show.
  const show = () => {
    if (!thread.component) return openDrawer();

    const element = document.querySelector(`[data-rx-id="${thread.component}"]`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    openDrawer({ component: thread.component, quote: thread.quote }, element);
  };

  return (
    <li
      className="rounded-md border border-border p-2.5 data-[resolved]:opacity-60"
      data-resolved={thread.resolved || undefined}
    >
      <div className="cursor-pointer" onClick={show}>
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-[0.625rem] text-muted-foreground"
            title={thread.component ?? undefined}
          >
            {thread.component ? describe(thread.component, thread.quote) : "Workspace"}
          </span>
          {!thread.resolved && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                resolve(thread.id);
              }}
            >
              Resolve
            </Button>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {thread.comments.map((comment, index) => (
            <div key={index}>
              <span className="text-[0.625rem] text-muted-foreground">{comment.author}</span>
              <p className="text-xs">{comment.text}</p>
            </div>
          ))}
        </div>
      </div>

      {!thread.resolved && (
        <div className="mt-2">
          <Composer label="Reply" onSubmit={(text) => reply(thread.id, text)} />
        </div>
      )}
    </li>
  );
}

// The comments sit in a second sidebar on the right, so they slide in and out
// the way the workspace list does. It has its own provider, because the one
// above holds the left sidebar's open state. `children` is the page beside it.
export function CommentDrawer({ children }: { children: React.ReactNode }) {
  const { drawer, openDrawer, closeDrawer } = useComments();

  return (
    <SidebarProvider
      className="min-h-0 flex-1"
      style={{ "--sidebar-width": "20rem" } as React.CSSProperties}
      open={drawer.open}
      onOpenChange={(open) => (open ? openDrawer() : closeDrawer())}
      keyboardShortcut={null}
    >
      {children}
      <Sidebar side="right" variant="floating" className="top-(--header-height) bottom-0 h-auto">
        <Threads />
      </Sidebar>
    </SidebarProvider>
  );
}

function Threads() {
  const { threads, drawer, closeDrawer, openDrawer, add } = useComments();
  const [showResolved, setShowResolved] = useState(false);

  // Whether the drawer is showing is not written down anywhere, so this is
  // the only way to ask for it, which is what actions are for. Everything the
  // drawer does to a comment goes through comments.json instead, and `rx
  // comment` writes that directly. It goes under `radix` alongside describe: a
  // component's own id is a UUID, so nothing on a page can claim the name.
  useAction("radix", "comments", (open: boolean) => (open ? openDrawer() : closeDrawer()));

  const visible = threads.filter((thread) => showResolved || !thread.resolved);
  const resolved = threads.filter((thread) => thread.resolved).length;

  return (
    <>
      <SidebarHeader className="flex-row items-center justify-between">
        <span className="px-1 text-xs text-muted-foreground">Comments</span>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={closeDrawer}>
          <Icon name="cancel-01" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="gap-3 p-2">
        <Composer
          label={
            drawer.target?.quote
              ? "Comment on the selected text"
              : drawer.target
                ? "Comment on this block"
                : "Comment on this workspace"
          }
          onSubmit={(text) => add(drawer.target, text)}
        />

        {visible.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}

        <ul className="flex flex-col gap-2">
          {visible.map((thread) => (
            <ThreadView key={thread.id} thread={thread} />
          ))}
        </ul>

        {resolved > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "Hide" : "Show"} {resolved} resolved
          </Button>
        )}
      </SidebarContent>
    </>
  );
}
