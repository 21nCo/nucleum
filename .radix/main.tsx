import React, { useEffect, useState } from "react";

import { AddMenu } from "./components/AddMenu.tsx";
import { Changes } from "./components/Changes.tsx";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar.tsx";
import { CommentDrawer } from "./components/CommentDrawer.tsx";
import { ContextMenu } from "./components/ContextMenu.tsx";
import { Icon } from "./components/Icon.tsx";
import { Inbox, InboxButton, useInbox } from "./components/Inbox.tsx";
import { CommentsProvider, useComments } from "./components/comments.tsx";
import { StateProvider } from "./components/state.tsx";

// A workspace made for a Claude Code session has the session's id in
// `session`. Those are listed under Sessions rather than Workspaces.
type Summary = { id: string; title: string; session?: string };

type Session = { id: string; title: string; modified: string; recorded: boolean };

type View = "workspaces" | "sessions";

// The inbox is a page of its own rather than a workspace, so it takes a name
// in the hash where a workspace id would otherwise be. Ids are UUIDs, so
// nothing can claim it.
const INBOX = "inbox";

function useHash() {
  const [hash, setHash] = useState(location.hash.slice(1));
  useEffect(() => {
    const update = () => setHash(location.hash.slice(1));
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);
  return hash;
}

// The list is read again when a workspace is renamed or made.
function useWorkspaces() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  useEffect(() => {
    const load = () =>
      fetch("/workspaces")
        .then((response) => response.json())
        .then(setSummaries);

    load();
    return radix.subscribe((_, file) => {
      if (file === "metadata.json") load();
    });
  }, []);
  return summaries;
}

// Claude Code's sessions for this repo. Read again when a workspace is made or
// renamed, since a session's title and whether it has a workspace both come
// from there.
function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => {
    const load = () =>
      fetch("/sessions")
        .then((response) => response.json())
        .then(setSessions);

    load();
    return radix.subscribe((_, file) => {
      if (file === "metadata.json") load();
    });
  }, []);
  return sessions;
}

// Which list the sidebar shows. Kept across reloads, where storage allows.
function useView() {
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem("radix.view") === "sessions" ? "sessions" : "workspaces";
    } catch {
      return "workspaces";
    }
  });

  const change = (next: View) => {
    setView(next);
    try {
      localStorage.setItem("radix.view", next);
    } catch {}
  };
  return [view, change] as const;
}

// The mark beside each row in the list. A small square rather than a file
// icon, which would be the same on every row. It darkens on the open
// workspace, and is only an outline for a session with no workspace yet.
function Bullet({ hollow = false }: { hollow?: boolean }) {
  const fill = hollow
    ? "border border-sidebar-foreground/40"
    : "bg-sidebar-foreground/30 group-data-active/menu-button:bg-sidebar-foreground";
  return <span className={"mx-1 size-1.5 shrink-0 rounded-[1px] " + fill} />;
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const option = (value: View, label: string) => (
    <Button
      variant={view === value ? "secondary" : "ghost"}
      size="sm"
      aria-pressed={view === value}
      className="flex-1"
      onClick={() => onChange(value)}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex gap-1">
      {option("workspaces", "Workspaces")}
      {option("sessions", "Sessions")}
    </div>
  );
}

// Deleting is done from the list, so the page has to be told the workspace has
// gone rather than waiting on a file change. The open workspace closing leaves
// the page on the empty state.
async function deleteWorkspace(id: string) {
  await radix.remove(id);
  if (location.hash.slice(1) === id) location.hash = "";
  radix.changed(id, "metadata.json");
}

// A row in the list. The trash icon shows on hover, and clicking it puts a
// tick and a cross in its place to confirm.
function WorkspaceRow({ summary, open }: { summary: Summary; open: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={summary.id === open}
        className={confirming ? "pr-14" : undefined}
        render={<a href={"#" + summary.id} />}
      >
        <Bullet />
        <span>{summary.title}</span>
      </SidebarMenuButton>
      {confirming ? (
        <>
          <SidebarMenuAction
            className="right-7"
            aria-label="Delete workspace"
            onClick={() => deleteWorkspace(summary.id)}
          >
            <Icon name="tick-02" />
          </SidebarMenuAction>
          <SidebarMenuAction aria-label="Keep workspace" onClick={() => setConfirming(false)}>
            <Icon name="cancel-01" />
          </SidebarMenuAction>
        </>
      ) : (
        <SidebarMenuAction showOnHover aria-label="Delete workspace" onClick={() => setConfirming(true)}>
          <Icon name="delete-02" />
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  );
}

function WorkspaceList({ summaries, open }: { summaries: Summary[]; open: string }) {
  return (
    <SidebarMenu>
      {summaries
        .filter((summary) => !summary.session)
        .map((summary) => (
          <WorkspaceRow key={summary.id} summary={summary} open={open} />
        ))}
    </SidebarMenu>
  );
}

// Opening a session makes its workspace, or adds whatever the transcript has
// gained since the last visit, and then shows it.
function SessionList({ open }: { open: string }) {
  const sessions = useSessions();

  const choose = async (id: string) => {
    const response = await fetch("/sessions/" + id + "/open", { method: "POST" });
    if (response.ok) location.hash = id;
  };

  return (
    <SidebarMenu>
      {sessions.map((session) => (
        <SidebarMenuItem key={session.id}>
          <SidebarMenuButton isActive={session.id === open} onClick={() => choose(session.id)}>
            <Bullet hollow={!session.recorded} />
            <span className="truncate">{session.title}</span>
            <span className="ml-auto shrink-0 text-[0.625rem] text-muted-foreground">
              {new Date(session.modified).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// The sidebar is fixed to the viewport, so it is pulled down to start below
// the title bar rather than running the full height of the window.
function Navigation({ summaries, open }: { summaries: Summary[]; open: string }) {
  const [view, setView] = useView();

  return (
    <Sidebar variant="floating" className="top-(--header-height) bottom-0 h-auto">
      <SidebarHeader>
        <ViewSwitch view={view} onChange={setView} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {view === "workspaces" ? (
              <WorkspaceList summaries={summaries} open={open} />
            ) : (
              <SessionList open={open} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function Workspace({ id }: { id: string }) {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const path = "/" + id + "/Workspace.tsx";

  useEffect(() => {
    setComponent(null);
    radix.import(path).then((module) => setComponent(() => module.default));
  }, [id]);

  return component ? React.createElement(component) : null;
}

// The open workspace's title. Clicking it turns it into a field: Enter or
// clicking away saves, Escape puts the old title back.
function Title({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        className="truncate rounded-md px-1.5 py-1 text-xs hover:bg-accent"
        onClick={() => setEditing(true)}
      >
        {name}
      </button>
    );
  }

  const save = (event: React.FocusEvent<HTMLInputElement>) => {
    const title = event.currentTarget.value.trim();
    if (title && title !== name) radix.rename(id, title);
    setEditing(false);
  };

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") event.currentTarget.value = name;
    if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
  };

  return (
    <input
      className="w-64 rounded-md bg-accent px-1.5 py-1 text-xs outline-none"
      defaultValue={name}
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onBlur={save}
      onKeyDown={keyDown}
    />
  );
}

// Makes an empty workspace and opens it. The title is a placeholder the user
// can change by clicking it.
function NewWorkspace() {
  const create = async () => {
    const now = new Date();
    const date = [now.getMonth() + 1, now.getDate()]
      .map((part) => String(part).padStart(2, "0"))
      .join("/");
    const { id } = await radix.create("Workspace " + date);
    location.hash = id;
  };

  return (
    <Button variant="ghost" size="icon-sm" aria-label="New workspace" onClick={create}>
      <Icon name="plus-sign" />
    </Button>
  );
}

// This is the window's title bar. It runs the full width above the sidebar.
// The traffic lights sit in it, drawn by the system on top of the page, which
// is what the left padding leaves room for.
function Header({
  rows,
  inbox,
  title,
  children,
}: {
  rows: InboxRow[];
  inbox: boolean;
  title?: React.ReactNode;
  children?: React.ReactNode;
}) {
  // A press on the bar's background drags the window, the way a title bar does.
  const press = (event: React.MouseEvent) => {
    if (!(event.target as Element).closest("a, button, input")) radix.dragWindow();
  };

  return (
    <header
      className="flex h-(--header-height) w-full shrink-0 items-center gap-2 pr-3 pl-(--traffic-lights)"
      onMouseDown={press}
    >
      <SidebarTrigger />
      <NewWorkspace />
      <InboxButton rows={rows} open={inbox} />
      <div className="flex min-w-0 flex-1">{title}</div>
      <div className="flex items-center gap-1">{children}</div>
    </header>
  );
}

function CommentsButton() {
  const { threads, drawer, openDrawer, closeDrawer } = useComments();
  const open = threads.filter((thread) => !thread.resolved).length;

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Comments"
      aria-expanded={drawer.open}
      onClick={() => (drawer.open ? closeDrawer() : openDrawer())}
    >
      <Icon name="comment-01" />
      {open > 0 && <Badge variant="secondary">{open}</Badge>}
    </Button>
  );
}

// The page a workspace is written on: plain background, edge to edge.
function Canvas({ children }: { children: React.ReactNode }) {
  return <div className="page flex-1 overflow-y-auto px-8 py-6">{children}</div>;
}

// The title bar above, the sidebar and the open workspace below it.
function Shell({
  summaries,
  open,
  header,
  children,
}: {
  summaries: Summary[];
  open: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="h-full min-h-0 flex-col">
      {header}
      <div className="flex min-h-0 w-full flex-1">
        <Navigation summaries={summaries} open={open} />
        <SidebarInset className="min-w-0">{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function Open({ id }: { id: string }) {
  return (
    <ContextMenu>
      <CommentDrawer>
        <Canvas>
          <Changes key={id} workspace={id}>
            <Workspace id={id} />
          </Changes>
          <AddMenu workspace={id} />
        </Canvas>
      </CommentDrawer>
    </ContextMenu>
  );
}

function Radix() {
  const id = useHash();
  const summaries = useWorkspaces();
  const rows = useInbox();

  // Which thread the inbox sent us to look at, if it was the inbox that put us
  // on this workspace. It is kept here rather than in the hash, which names
  // the workspace and nothing else.
  const [showing, setShowing] = useState<{ workspace: string; target: Target | null } | null>(null);

  const openRow = (row: InboxRow) => {
    setShowing({
      workspace: row.workspace,
      target: row.component ? { component: row.component, quote: row.quote ?? undefined } : null,
    });
    location.hash = row.workspace;
  };

  // Opening a workspace moves it to the top of the sidebar next time the list
  // is read, which the metadata change brings about on its own.
  useEffect(() => {
    if (id && id !== INBOX) radix.open(id);
  }, [id]);

  const name = summaries.find((summary) => summary.id === id)?.title;

  if (id === INBOX) {
    return (
      <Shell summaries={summaries} open="" header={<Header rows={rows} inbox />}>
        <Canvas>
          <Inbox rows={rows} onOpen={openRow} />
        </Canvas>
      </Shell>
    );
  }

  if (!id) {
    return (
      <Shell summaries={summaries} open={id} header={<Header rows={rows} inbox={false} />}>
        <Canvas>
          <p className="text-sm text-muted-foreground">
            Choose a workspace, or make one with <code>rx workspace new</code>.
          </p>
        </Canvas>
      </Shell>
    );
  }

  return (
    <StateProvider workspace={id}>
      <CommentsProvider workspace={id} show={showing?.workspace === id ? showing : undefined}>
        <Shell
          summaries={summaries}
          open={id}
          header={
            <Header
              rows={rows}
              inbox={false}
              title={name && <Title key={id} id={id} name={name} />}
            >
              <CommentsButton />
            </Header>
          }
        >
          <Open id={id} />
        </Shell>
      </CommentsProvider>
    </StateProvider>
  );
}

export default Radix;
