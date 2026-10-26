import React, { useEffect, useRef, useState } from "react";

import {
  ContextMenu as Root,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu.tsx";
import { Icon } from "./Icon.tsx";
import { quoteOf, useComments } from "./comments.tsx";
import { useStore } from "./state.tsx";

// What was right-clicked. A component, or a block that has been commented on,
// has an id. A block that has not has only where it starts in the source,
// which the loader put on it. The quote is the text selected inside it, if any.
type Picked = {
  element: Element;
  id: string | null;
  source: string | null;
  tag: string;
  text: string;
  quote: Quote | null;
};

// Wraps the page so a right-click on a component or a block opens a menu about
// it. The trigger takes no layout of its own, so what it wraps lays out as
// before.
export function ContextMenu({ children }: { children: React.ReactNode }) {
  const { values } = useStore();
  const { openDrawer } = useComments();
  const [picked, setPicked] = useState<Picked | null>(null);

  // The selection as it was when the mouse went down. WebKit selects the word
  // under the pointer on a right-click before the menu event arrives, so the
  // selection read then is not always the one the user made.
  const selection = useRef<Range | null>(null);

  useEffect(() => {
    const remember = () => {
      const current = window.getSelection();
      selection.current = current && current.rangeCount > 0 ? current.getRangeAt(0).cloneRange() : null;
    };

    document.addEventListener("mousedown", remember, true);
    return () => document.removeEventListener("mousedown", remember, true);
  }, []);

  useEffect(() => {
    const pick = (event: MouseEvent) => {
      const element = (event.target as Element).closest("[data-rx-id], [data-rx-source]");

      // A right-click on anything else is left to the browser, which is what
      // keeps the web inspector reachable. Stopping the event here means the
      // menu below never sees it. The listener is on the document in the
      // capture phase so it runs first.
      if (!element) return event.stopPropagation();

      // Highlights the element while the menu is open. See style.css.
      document.querySelector("[data-rx-picked]")?.removeAttribute("data-rx-picked");
      element.setAttribute("data-rx-picked", "");

      setPicked({
        element,
        id: element.getAttribute("data-rx-id"),
        source: element.getAttribute("data-rx-source"),
        tag: element.tagName.toLowerCase(),
        text: element.textContent ?? "",
        quote: quoteOf(element, selection.current),
      });
    };

    document.addEventListener("contextmenu", pick, true);
    return () => document.removeEventListener("contextmenu", pick, true);
  }, []);

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const hasData = !!picked?.id && picked.id in values;

  const comment = () => {
    const quote = picked?.quote ?? undefined;
    if (picked?.id) openDrawer({ component: picked.id, quote }, picked.element);
    else if (picked?.source) {
      openDrawer({ source: picked.source, tag: picked.tag, quote }, picked.element);
    }
  };

  return (
    <Root
      onOpenChange={(open) => {
        if (!open) document.querySelector("[data-rx-picked]")?.removeAttribute("data-rx-picked");
      }}
    >
      <ContextMenuTrigger className="contents select-text">{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        {picked?.id && (
          <ContextMenuItem onClick={() => copy(picked.id ?? "")}>
            <Icon name="hashtag" />
            Copy id
          </ContextMenuItem>
        )}
        {hasData ? (
          <ContextMenuItem
            onClick={() => copy(JSON.stringify(values[picked?.id ?? ""] ?? null, null, 2))}
          >
            <Icon name="source-code" />
            Copy data
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={() => copy(picked?.text ?? "")}>
            <Icon name="text-align-left" />
            Copy text
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={comment}>
          <Icon name="comment-01" />
          Comment
        </ContextMenuItem>
      </ContextMenuContent>
    </Root>
  );
}
