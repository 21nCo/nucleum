type ThreadComment = { author: string; at: string; text: string };

// Part of a component's text, with where it starts and ends in that text.
type Quote = { text: string; start: number; end: number };

type Thread = {
  id: string;
  component: string | null;
  quote?: Quote;
  created: string;
  resolved: boolean;
  comments: ThreadComment[];
};

// One open thread, as the inbox lists it. The kind says whose turn it is:
// "you" when the agent wrote the last comment, "agent" when the user did.
type InboxRow = {
  workspace: string;
  title: string;
  thread: string;
  component: string | null;
  quote: Quote | null;
  kind: "you" | "agent";
  text: string;
  at: string;
};

// What a new thread is attached to. A block that has not been commented on
// has no id yet, only where it starts in its workspace's source. The quote is
// the text that was selected, if any.
type Target = ({ component: string } | { source: string; tag: string }) & { quote?: Quote };

// The repo's four lists, in .radix/decisions.json. Ids are unique across all
// four, so an id alone says which list it belongs to.
type Message = {
  id: string;
  label: "question" | "task" | "decision" | "preference" | "note";
  text: string;
  source: string;
  status: "open" | "answered" | "dropped";
  where?: string;
  why?: string;
  at: string;
};

type Proposal = {
  id: string;
  text: string;
  kind: "action" | "decision";
  status: "undecided" | "approved" | "rejected" | "later";
  note: string;
  workspace?: string;
  asked?: boolean;
  at: string;
};

type RecordEntry = {
  id: string;
  text: string;
  kind: "action" | "decision";
  by: "user" | "agent";
  result: "done" | "dropped";
  note?: string;
  from?: string;
  at: string;
};

type Preference = { id: string; text: string; by: "user" | "agent"; paused?: boolean; at: string };

type DecisionLists = {
  messages: Message[];
  proposals: Proposal[];
  record: RecordEntry[];
  preferences: Preference[];
  next: number;
};

declare const radix: {
  import(path: string): Promise<any>;

  state: {
    read(workspace: string): Promise<Record<string, any>>;
    write(workspace: string, component: string, data: any): Promise<void>;
  };

  decisions: {
    read(): Promise<DecisionLists>;
    write(document: DecisionLists): Promise<void>;
  };

  comments: {
    read(workspace: string): Promise<Thread[]>;
    add(workspace: string, target: Target | null, text: string): Promise<{ id: string }>;
    reply(workspace: string, thread: string, text: string): Promise<void>;
    resolve(workspace: string, thread: string): Promise<void>;
    inbox(): Promise<InboxRow[]>;
  };

  files: {
    read(file: string): Promise<string>;
    write(file: string, contents: string): Promise<void>;
    subscribe(listener: (files: string[]) => void): () => void;
    changed(files: string[]): void;
  };

  report(kind: string, message: string, file?: string): void;

  add(workspace: string, name: string, before?: string): Promise<{ id: string }>;
  create(title: string): Promise<{ id: string }>;
  rename(workspace: string, title: string): Promise<void>;
  remove(workspace: string): Promise<void>;
  open(workspace: string): Promise<void>;

  dragWindow(): void;

  subscribe(listener: (workspace: string, file: string) => void): () => void;
  changed(workspace: string, file: string): void;
  updated(path: string): Promise<void>;
};
