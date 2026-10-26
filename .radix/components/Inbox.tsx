import React, { useEffect, useState } from "react";

import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Icon } from "./Icon.tsx";
import { cn } from "./ui/cn.ts";
import { useDecisions } from "./decisions.tsx";

// Whose turn a thread is on. There are only these two, because they are what
// the comments on disk can say: a thread the agent spoke on last is waiting
// for the user, and one the user spoke on last is waiting for the agent.
const KINDS = {
  you: { label: "Needs you", tone: "bg-amber-500" },
  agent: { label: "Agent's turn", tone: "bg-sky-500" },
} as const;

type Filter = "all" | keyof typeof KINDS;

// The five lists the page shows. Threads come from the workspaces, the other
// four from .radix/decisions.json.
const TABS = [
  { value: "threads", label: "Threads" },
  { value: "messages", label: "From you" },
  { value: "proposals", label: "Proposals" },
  { value: "record", label: "Record" },
  { value: "preferences", label: "Preferences" },
] as const;

type Tab = (typeof TABS)[number]["value"];

// Every workspace's open threads. Read again when any workspace's comments
// change, so a reply the agent writes while this is on screen turns up.
export function useInbox() {
  const [rows, setRows] = useState<InboxRow[]>([]);

  useEffect(() => {
    const load = () => radix.comments.inbox().then(setRows);

    load();
    return radix.subscribe((_, file) => {
      if (file === "comments.json") load();
    });
  }, []);

  return rows;
}

// How long ago, in the shortest form that says it.
function ago(at: string) {
  const seconds = (Date.now() - new Date(at).getTime()) / 1000;
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 60) return "now";

  const minutes = seconds / 60;
  if (minutes < 60) return Math.floor(minutes) + "m";

  const hours = minutes / 60;
  if (hours < 24) return Math.floor(hours) + "h";
  return Math.floor(hours / 24) + "d";
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        "rounded-md px-2 py-1 text-xs " +
        (active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")
      }
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
    </button>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

function Row({ row, onOpen }: { row: InboxRow; onOpen: (row: InboxRow) => void }) {
  return (
    <button
      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40"
      onClick={() => onOpen(row)}
    >
      <span
        className={"size-2 shrink-0 rounded-full " + KINDS[row.kind].tone}
        title={KINDS[row.kind].label}
      />
      <span className="w-44 shrink-0 truncate text-xs text-muted-foreground">{row.title}</span>
      <span className="min-w-0 flex-1 truncate text-sm">{row.text}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{ago(row.at)}</span>
    </button>
  );
}

function Threads({ rows, onOpen }: { rows: InboxRow[]; onOpen: (row: InboxRow) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = rows.filter((row) => filter === "all" || row.kind === filter);

  const count = (of: Filter) =>
    of === "all" ? rows.length : rows.filter((row) => row.kind === of).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1">
        <Chip
          label="All"
          count={count("all")}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((kind) => (
          <Chip
            key={kind}
            label={KINDS[kind].label}
            count={count(kind)}
            active={filter === kind}
            onClick={() => setFilter(kind)}
          />
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty>Nothing is waiting.</Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {shown.map((row) => (
            <Row key={row.thread} row={row} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  );
}

// The answers a proposal can have. Undecided is one of them, because silence
// is the answer the agent would otherwise fill in for itself.
const ANSWERS = [
  { value: "approved", label: "Approve", tone: "bg-emerald-600 text-white" },
  { value: "rejected", label: "Reject", tone: "bg-red-600 text-white" },
  { value: "later", label: "Later", tone: "bg-sky-600 text-white" },
  { value: "undecided", label: "?", tone: "bg-amber-500 text-white" },
] as const;

const KIND_STYLE = {
  action: "text-sky-700 dark:text-sky-400 border-sky-600/40",
  decision: "text-violet-700 dark:text-violet-400 border-violet-600/40",
} as const;

const LABEL_STYLE = {
  question: "text-amber-700 dark:text-amber-400 border-amber-500/50",
  task: "text-sky-700 dark:text-sky-400 border-sky-600/40",
  decision: "text-violet-700 dark:text-violet-400 border-violet-600/40",
  preference: "text-emerald-700 dark:text-emerald-400 border-emerald-600/40",
  note: "text-muted-foreground",
} as const;

function Answer({
  status,
  onChange,
}: {
  status: Proposal["status"];
  onChange: (status: Proposal["status"]) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-border p-0.5">
      {ANSWERS.map((answer) => (
        <button
          key={answer.value}
          onClick={() => onChange(answer.value)}
          className={cn(
            "rounded px-2 py-0.5 text-[0.6875rem]",
            status === answer.value ? answer.tone : "text-muted-foreground hover:bg-muted",
          )}
        >
          {answer.label}
        </button>
      ))}
    </div>
  );
}

function Proposals({
  lists,
  save,
  onOpenWorkspace,
}: {
  lists: DecisionLists;
  save: (lists: DecisionLists) => void;
  onOpenWorkspace: (workspace: string) => void;
}) {
  const decide = (id: string, change: Partial<Proposal>) =>
    save({
      ...lists,
      proposals: lists.proposals.map((p) => (p.id === id ? { ...p, ...change } : p)),
    });

  // The same move `rx proposal done` makes: an answered proposal leaves the
  // list and turns into a line in the record.
  const finish = (proposal: Proposal) =>
    save({
      ...lists,
      proposals: lists.proposals.filter((p) => p.id !== proposal.id),
      record: [
        ...lists.record,
        {
          id: "r" + lists.next,
          text: proposal.text,
          kind: proposal.kind,
          by: "user",
          result: proposal.status === "approved" ? "done" : "dropped",
          note: proposal.note || undefined,
          from: proposal.id,
          at: new Date().toISOString(),
        },
      ],
      next: lists.next + 1,
    });

  if (lists.proposals.length === 0) return <Empty>Nothing proposed.</Empty>;

  return (
    <div className="space-y-2">
      {lists.proposals.map((proposal) => (
        <div key={proposal.id} className="space-y-1.5 rounded-md border border-border px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm">{proposal.text}</span>
            <Answer status={proposal.status} onChange={(status) => decide(proposal.id, { status })} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill className={KIND_STYLE[proposal.kind]}>{proposal.kind}</Pill>
            <Pill className="text-muted-foreground">{proposal.id}</Pill>
            {proposal.asked && proposal.status === "undecided" && (
              <Pill className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                <Icon name="clock-01" className="size-3" />
                the agent is waiting
              </Pill>
            )}
            {proposal.workspace && (
              <button
                className="text-[0.6875rem] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => onOpenWorkspace(proposal.workspace!)}
              >
                from a workspace
              </button>
            )}
            <span className="text-[0.6875rem] text-muted-foreground">{ago(proposal.at)}</span>
            {(proposal.status === "approved" || proposal.status === "rejected") && (
              <Button size="sm" variant="ghost" onClick={() => finish(proposal)}>
                <Icon name="arrow-right-01" className="size-3.5" />
                {proposal.status === "approved" ? "Mark done" : "File as dropped"}
              </Button>
            )}
          </div>
          {(proposal.status === "rejected" || proposal.status === "later") && (
            <Input
              placeholder={proposal.status === "later" ? "Revisit when..." : "Why not?"}
              value={proposal.note}
              onChange={(e) => decide(proposal.id, { note: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function RecordList({
  lists,
  save,
}: {
  lists: DecisionLists;
  save: (lists: DecisionLists) => void;
}) {
  // A one-off decision that turns out to apply to everything becomes a
  // preference. That is the one thing this list is not read only for.
  const keep = (entry: RecordEntry) =>
    save({
      ...lists,
      preferences: [
        ...lists.preferences,
        { id: "s" + lists.next, text: entry.text, by: entry.by, at: new Date().toISOString() },
      ],
      next: lists.next + 1,
    });

  if (lists.record.length === 0) return <Empty>Nothing has happened yet.</Empty>;

  return (
    <div className="space-y-1.5">
      {lists.record.map((entry) => (
        <div key={entry.id} className="rounded-md border border-border px-3 py-2">
          <div className="flex items-start gap-2">
            <Icon
              name={entry.result === "done" ? "checkmark-circle-02" : "cancel-circle"}
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                entry.result === "done" ? "text-emerald-600" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "min-w-0 flex-1 text-sm",
                entry.result === "dropped" && "text-muted-foreground",
              )}
            >
              {entry.text}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {ago(entry.at)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
            <Pill className={KIND_STYLE[entry.kind]}>{entry.kind}</Pill>
            <Pill className="text-muted-foreground">
              <Icon name={entry.by === "user" ? "user" : "bot"} className="size-3" />
              {entry.by === "user" ? "you answered it" : "the agent decided"}
            </Pill>
            {entry.note && (
              <span className="text-[0.6875rem] text-muted-foreground">{entry.note}</span>
            )}
            {entry.kind === "decision" && entry.result === "done" && (
              <Button size="sm" variant="ghost" onClick={() => keep(entry)}>
                <Icon name="arrow-down-01" className="size-3.5" />
                Keep it
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Preferences({
  lists,
  save,
}: {
  lists: DecisionLists;
  save: (lists: DecisionLists) => void;
}) {
  const [draft, setDraft] = useState("");

  const change = (id: string, alter: Partial<Preference>) =>
    save({
      ...lists,
      preferences: lists.preferences.map((p) => (p.id === id ? { ...p, ...alter } : p)),
    });

  const retire = (id: string) =>
    save({ ...lists, preferences: lists.preferences.filter((p) => p.id !== id) });

  const add = (text: string) =>
    save({
      ...lists,
      preferences: [
        ...lists.preferences,
        { id: "s" + lists.next, text, by: "user", at: new Date().toISOString() },
      ],
      next: lists.next + 1,
    });

  return (
    <div className="space-y-1.5">
      <p className="!mt-0 text-xs text-muted-foreground">
        Read before the next change starts. Edit the text to change one, or pause it to stop it
        applying without losing it.
      </p>
      {lists.preferences.map((preference) => (
        <div key={preference.id} className="flex items-center gap-1.5">
          <Icon
            name={preference.by === "user" ? "user" : "bot"}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <Input
            className={cn(preference.paused && "text-muted-foreground line-through")}
            value={preference.text}
            onChange={(e) => change(preference.id, { text: e.target.value })}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => change(preference.id, { paused: !preference.paused })}
          >
            {preference.paused ? "Resume" : "Pause"}
          </Button>
          <button
            className="px-1 text-muted-foreground hover:text-foreground"
            onClick={() => retire(preference.id)}
            title="Retire"
          >
            <Icon name="cancel-01" className="size-3.5" />
          </button>
        </div>
      ))}
      <form
        className="flex gap-1.5 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) add(draft.trim());
          setDraft("");
        }}
      >
        <Input
          placeholder="Add a preference"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button size="sm" variant="outline" type="submit">
          Add
        </Button>
      </form>
    </div>
  );
}

function Messages({
  lists,
  save,
  onOpenWorkspace,
}: {
  lists: DecisionLists;
  save: (lists: DecisionLists) => void;
  onOpenWorkspace: (workspace: string) => void;
}) {
  const change = (id: string, alter: Partial<Message>) =>
    save({ ...lists, messages: lists.messages.map((m) => (m.id === id ? { ...m, ...alter } : m)) });

  if (lists.messages.length === 0)
    return <Empty>Nothing has been taken out of your messages yet.</Empty>;

  return (
    <div className="space-y-1.5">
      <p className="!mt-0 text-xs text-muted-foreground">
        The parts of what you said that ask for an answer or change what gets built, with a link
        back to where you said it. The agent works down the open ones.
      </p>
      {lists.messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "rounded-md border border-border px-3 py-2",
            message.status !== "open" && "bg-muted/30",
          )}
        >
          <div className="flex items-start gap-2">
            <Icon
              name={
                message.status === "answered"
                  ? "checkmark-circle-02"
                  : message.status === "dropped"
                    ? "cancel-circle"
                    : "clock-01"
              }
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                message.status === "answered"
                  ? "text-emerald-600"
                  : message.status === "dropped"
                    ? "text-muted-foreground"
                    : "text-amber-500",
              )}
            />
            <span className="min-w-0 flex-1 text-sm">{message.text}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {ago(message.at)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
            <Pill className={LABEL_STYLE[message.label]}>{message.label}</Pill>
            <Pill className="text-muted-foreground">{message.source}</Pill>
            {message.where && (
              <button
                className="text-[0.6875rem] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => onOpenWorkspace(message.where!)}
              >
                answered in {message.where}
              </button>
            )}
            {message.why && (
              <span className="text-[0.6875rem] text-muted-foreground">{message.why}</span>
            )}
            {message.status === "open" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => change(message.id, { status: "dropped", why: "not worth doing" })}
              >
                <Icon name="cancel-01" className="size-3.5" />
                Drop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => change(message.id, { status: "open", where: undefined })}
              >
                <Icon name="refresh" className="size-3.5" />
                Reopen
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// What each tab counts, which is what is waiting rather than how much is
// there. The record has no waiting, so it counts everything.
function counts(rows: InboxRow[], lists: DecisionLists): Record<Tab, number> {
  return {
    threads: rows.filter((row) => row.kind === "you").length,
    messages: lists.messages.filter((m) => m.status === "open").length,
    proposals: lists.proposals.filter((p) => p.status === "undecided").length,
    record: lists.record.length,
    preferences: lists.preferences.filter((p) => !p.paused).length,
  };
}

// The page holding all five lists, as its own page rather than a workspace:
// it is about all of them, and it has no source file of its own to comment on.
export function Inbox({ rows, onOpen }: { rows: InboxRow[]; onOpen: (row: InboxRow) => void }) {
  const [tab, setTab] = useState<Tab>("threads");
  const [lists, save] = useDecisions();
  const waiting = counts(rows, lists);

  const openWorkspace = (id: string) => {
    location.hash = id;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1>Inbox</h1>

      <div className="mb-3 flex items-center gap-1 border-b border-border pb-2">
        {TABS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTab(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
              tab === option.value
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {option.label}
            <span className="tabular-nums opacity-60">{waiting[option.value]}</span>
          </button>
        ))}
        <span className="ml-auto pr-1 text-[0.625rem] text-muted-foreground">
          global to this repo
        </span>
      </div>

      {tab === "threads" && <Threads rows={rows} onOpen={onOpen} />}
      {tab === "messages" && (
        <Messages lists={lists} save={save} onOpenWorkspace={openWorkspace} />
      )}
      {tab === "proposals" && (
        <Proposals lists={lists} save={save} onOpenWorkspace={openWorkspace} />
      )}
      {tab === "record" && <RecordList lists={lists} save={save} />}
      {tab === "preferences" && <Preferences lists={lists} save={save} />}
    </div>
  );
}

// The way into the inbox, beside the button that makes a workspace. The mark
// is what is waiting on the user: a thread on their turn, or a proposal
// nobody has answered.
export function InboxButton({ rows, open }: { rows: InboxRow[]; open: boolean }) {
  const [lists] = useDecisions();
  const waiting =
    rows.filter((row) => row.kind === "you").length +
    lists.proposals.filter((proposal) => proposal.status === "undecided").length;

  return (
    <a
      className="relative flex size-7 items-center justify-center rounded-md text-foreground hover:bg-accent aria-[current=page]:bg-accent"
      href={open ? "#" : "#inbox"}
      aria-current={open ? "page" : undefined}
      aria-label="Inbox"
    >
      <Icon name="inbox" />
      {waiting > 0 && (
        <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-amber-500" />
      )}
    </a>
  );
}
