import React, { useEffect, useState } from "react";

import { Icon } from "./Icon.tsx";
import { Markdown } from "./Markdown.tsx";
import { useSelectable } from "./selection.tsx";

// The parts of a Claude Code session. A session's workspace has one of these
// for each message and tool call, and each reads its content from the
// transcript through the server rather than from state.json. See
// src/sessions.h.

type Item =
  | { id: string; kind: "message"; role: "user" | "agent"; time: string; text: string }
  | { id: string; kind: "image"; role: "user" | "agent"; time: string }
  | {
    id: string;
    kind: "tool";
    name: string;
    time: string;
    input: Record<string, any>;
    output?: string;
    lines?: number;
    clipped?: boolean;
    error?: boolean;
  };

// One request per session, shared by every component on the page.
const sessions = new Map<string, Promise<Item[]>>();

function load(session: string, fresh = false) {
  if (fresh || !sessions.has(session)) {
    const items = fetch("/sessions/" + session).then((response) => (response.ok ? response.json() : []));
    sessions.set(session, items);
  }
  return sessions.get(session)!;
}

// The item with this id: undefined while loading, null if the transcript does
// not have it. A line that was just added to the page will not be in the
// items fetched earlier, so look once more before giving up.
function useItem(session: string, id: string) {
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    const find = (items: Item[]) => items.find((item) => item.id === id);
    const show = (found: Item | null) => current && setItem(found);

    load(session).then((items) => {
      if (find(items)) return show(find(items)!);
      load(session, true).then((items) => show(find(items) ?? null));
    });
    return () => {
      current = false;
    };
  }, [session, id]);

  return item;
}

function Missing({ id, selectable }: { id: string; selectable: object }) {
  return (
    <div className="my-4 text-xs text-muted-foreground" {...selectable}>
      {id} is not in the transcript.
    </div>
  );
}

function Role({ role }: { role: "user" | "agent" }) {
  return <div className="w-12 shrink-0 pt-0.5 text-xs text-muted-foreground">{role === "user" ? "You" : "Agent"}</div>;
}

export function Message({ session, id }: { session: string; id: string }) {
  const item = useItem(session, id);
  const selectable = useSelectable(id);

  if (item === undefined) return <div className="my-4 h-5" {...selectable} />;
  if (item === null || item.kind === "tool") return <Missing id={id} selectable={selectable} />;

  const bubble = item.role === "user" ? "rounded-md bg-muted px-3 py-2" : "";

  return (
    <div className="group my-4 flex gap-3" {...selectable}>
      <Role role={item.role} />
      <div className="min-w-0 flex-1">
        {item.kind === "image" ? (
          <div className={"flex items-center gap-2 text-xs text-muted-foreground " + bubble}>
            <Icon name="image-01" className="size-3.5" />
            An image, not shown here.
          </div>
        ) : item.role === "agent" ? (
          <Markdown text={item.text} />
        ) : (
          <div className={"text-sm/relaxed whitespace-pre-wrap " + bubble}>{item.text}</div>
        )}
        <div className="mt-1 text-[0.6875rem] text-muted-foreground opacity-0 group-hover:opacity-100">
          {new Date(item.time).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// The one line that says what a call did, in the terms of the tool.
function summary(name: string, input: Record<string, any>) {
  if (name === "Bash") return input.description || input.command;
  if (typeof input.file_path === "string") return input.file_path;
  if (typeof input.pattern === "string") return input.pattern;
  return JSON.stringify(input);
}

// A tool call and its result. Closed, it is one line. Open, it shows what went
// in and the start of what came out.
export function ToolCall({ session, id }: { session: string; id: string }) {
  const item = useItem(session, id);
  const selectable = useSelectable(id);
  const [open, setOpen] = useState(false);

  if (item === undefined) return <div className="my-1 h-6" {...selectable} />;
  if (item === null || item.kind !== "tool") return <Missing id={id} selectable={selectable} />;

  const detail = item.name === "Bash" ? item.input.command : JSON.stringify(item.input, null, 2);

  return (
    <div className="my-1 ml-15" {...selectable}>
      <button
        className="flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent"
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "arrow-down-01" : "arrow-right-01"} className="size-3.5 text-muted-foreground" />
        <span className="font-mono">{item.name}</span>
        <span className="truncate text-muted-foreground">{summary(item.name, item.input)}</span>
        {item.error && <span className="text-destructive">failed</span>}
        {/*{item.lines !== undefined && <span className="ml-auto shrink-0 text-muted-foreground">{item.lines} lines</span>}*/}
      </button>
      {open && (
        <div className="mt-1 mb-3 space-y-2 pl-7">
          <div className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs whitespace-pre-wrap">{detail}</div>
          {item.output !== undefined && (
            <div className="max-h-80 overflow-auto rounded-md border border-border px-3 py-2 font-mono text-xs whitespace-pre">
              {item.output}
              {item.clipped && "\n…"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
