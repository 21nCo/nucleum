import { getContext, setContext, tick } from "svelte";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import {
  headingNodeTypes,
  listNodeTypes,
  simpleTextNodeTypeList
} from "@nucleum/features/memory/node/node.type";

/** Focus entry points of the open, editable note editors, by pane and note. */
const focusers = new Map<string, () => void>();

function focuserKey(id: IRecordId, paneId: string) {
  return JSON.stringify([paneId, id.toString()]);
}

/** How long a request to focus a not yet shown editor stays valid, in ms. */
const PENDING_FOCUS_TTL_MS = 3000;

/** A request to focus a pane's note editor once that editor is shown. */
interface PendingNoteEditorFocus {
  /**
   * When the request lapses, in ms since the epoch: never while the pane's
   * note content prepares its blocks (see {@link reportNoteContentState}).
   */
  expiry: number;
  /**
   * Whether bringing the editor back started a navigation that has not ended
   * yet: its end resets focus, so the request is served only once the pane
   * reports that end through {@link runPendingNoteEditorFocus}.
   */
  isAwaitingNavigation: boolean;
}

/** Focus requests waiting for their editor to be shown. */
const pendingFocus = new Map<string, PendingNoteEditorFocus>();

/** What bringing a pane's hidden note editor back did. */
export interface NoteEditorReveal {
  /** Whether it started a navigation, which resets focus when it ends. */
  isNavigating: boolean;
}

/**
 * Serves a pane's waiting focus request with its current editor, if the
 * request has not expired. Returns whether it focused the editor.
 */
function servePendingFocus(key: string) {
  const request = pendingFocus.get(key);
  if (!request) return false;
  const focus = focusers.get(key);
  if (!focus) return false;
  pendingFocus.delete(key);
  if (Date.now() > request.expiry) return false;
  focus();
  return true;
}

/**
 * Registers how a note's editor in a pane takes focus, replacing an earlier
 * registration there. A focus request waiting for this editor is served
 * once the editor has rendered when no navigation of its reveal is still
 * running: its reveal started none, such as closing the cover picker or a
 * panel switch that left the URL as it was, or that navigation already
 * ended before the editor mounted. Returns the release, which removes the
 * registration only while it is still this one, so a remounted editor keeps
 * its own.
 */
export function registerNoteEditorFocus(
  id: IRecordId,
  paneId: string,
  focus: () => void
) {
  const key = focuserKey(id, paneId);
  focusers.set(key, focus);
  const request = pendingFocus.get(key);
  if (request && !request.isAwaitingNavigation) {
    void tick().then(() => {
      if (focusers.get(key) === focus) servePendingFocus(key);
    });
  }
  return () => {
    if (focusers.get(key) === focus) focusers.delete(key);
  };
}

/**
 * Puts the caret in a note's editor in one pane. While that pane shows no
 * editable editor of the note, such as under a side panel in a narrow pane
 * or the cover picker, runs `reveal` to bring the editor back and keeps the
 * request until the editor is shown and any navigation `reveal` started has
 * ended, as its end resets focus, in whichever order those happen. The request
 * lapses {@link PENDING_FOCUS_TTL_MS} after it is made or after the shown
 * content has prepared its blocks, however long that takes, and is dropped
 * when the content cannot be edited. Does nothing without `reveal` then.
 */
export function focusNoteEditor(
  id: IRecordId,
  paneId: string,
  reveal?: () => NoteEditorReveal
) {
  const key = focuserKey(id, paneId);
  const focus = focusers.get(key);
  if (focus) {
    pendingFocus.delete(key);
    focus();
    return;
  }
  if (!reveal) return;
  const request: PendingNoteEditorFocus = {
    expiry: Date.now() + PENDING_FOCUS_TTL_MS,
    isAwaitingNavigation: true
  };
  pendingFocus.set(key, request);
  request.isAwaitingNavigation = reveal().isNavigating;
  if (!request.isAwaitingNavigation) {
    void tick().then(() => {
      if (pendingFocus.get(key) === request) servePendingFocus(key);
    });
  }
}

/**
 * Records that a navigation has ended in a pane, for the focus request
 * waiting there for a note's editor: serves it at once if the editor is
 * shown and the request has not lapsed, otherwise lets the editor serve it
 * when it registers. The pane's note view calls this, as it stays mounted
 * while the editor mounts only once its content is prepared, maybe after
 * the navigation ended. A navigation that never ends, such as a cancelled
 * one, leaves the request to lapse. Returns whether it focused the editor.
 */
export function runPendingNoteEditorFocus(id: IRecordId, paneId: string) {
  const key = focuserKey(id, paneId);
  const request = pendingFocus.get(key);
  if (request) request.isAwaitingNavigation = false;
  return servePendingFocus(key);
}

/**
 * Whether a pane's note content can show its editor: `preparing` while it
 * loads the note's blocks, so no editor is shown yet; `ready` once its
 * editor is shown with every block, taking edits unless the note is
 * read-only; `unavailable` when it opened without some of its blocks, which
 * keeps the editor read-only, or gave up loading them.
 */
export type NoteContentState = "preparing" | "ready" | "unavailable";

/** The state of a note content from how preparing its blocks went. */
export function resolveNoteContentState(content: {
  isInitialContentReady: boolean;
  isOpenedIncomplete: boolean;
  isPreparationAbandoned: boolean;
}): NoteContentState {
  if (content.isOpenedIncomplete || content.isPreparationAbandoned) {
    return "unavailable";
  }
  return content.isInitialContentReady ? "ready" : "preparing";
}

/**
 * What a pane keeps of its note content's state once that content unmounts,
 * under a side panel or the cover picker: a settled state as it was, but
 * nothing for a content still preparing, whose next mount prepares again,
 * so Edit can bring it back.
 */
export function resolveUnmountedNoteContentState(
  state: NoteContentState | undefined
) {
  return state === "preparing" ? undefined : state;
}

/**
 * Applies a pane's note content state to the focus request waiting for its
 * editor: holds it while the content prepares, starts its lapse once the
 * content is ready or gone (`undefined`, unmounted), and drops it when the
 * content cannot be edited or the request has already lapsed.
 */
export function reportNoteContentState(
  id: IRecordId,
  paneId: string,
  state: NoteContentState | undefined
) {
  const key = focuserKey(id, paneId);
  const request = pendingFocus.get(key);
  if (!request) return;
  if (state === "unavailable" || Date.now() > request.expiry) {
    pendingFocus.delete(key);
  } else if (state === "preparing") {
    request.expiry = Number.POSITIVE_INFINITY;
  } else if (request.expiry === Number.POSITIVE_INFINITY) {
    request.expiry = Date.now() + PENDING_FOCUS_TTL_MS;
  }
}

/**
 * What one pane's view of an open note knows about whether its editor takes
 * edits. It belongs to that pane alone: other views of the note share its
 * node store, so the store cannot hold it.
 */
export interface NotePaneEditor {
  /**
   * Records the state of the pane's note content, or none. The pane keeps
   * the last one while a side panel or the cover picker unmounts the
   * content (see {@link resolveUnmountedNoteContentState}).
   */
  setContentState(state: NoteContentState | undefined): void;
}

const NOTE_PANE_EDITOR_CONTEXT = Symbol("note-pane-editor");

/** Gives a pane's note content a way to report on its editor to the pane. */
export function setNotePaneEditor(editor: NotePaneEditor) {
  setContext(NOTE_PANE_EDITOR_CONTEXT, editor);
}

/** The pane editor report of the note view this content is in, if any. */
export function getNotePaneEditor() {
  return getContext<NotePaneEditor | undefined>(NOTE_PANE_EDITOR_CONTEXT);
}

/**
 * Whether a markdown block shows a text input that takes a caret, as its
 * content renders one (see `BlockContent`): a heading, a callout, a list
 * item or a text block with its usual body. Dividers and other blocks
 * without text do not.
 */
function canBlockTakeCaret(block: {
  id?: IRecordId;
  contentType?: NodeType;
  body?: unknown;
}) {
  const type = block.contentType;
  if (block.id == null || type == null) return false;
  if (headingNodeTypes.includes(type) || type === NodeType.CALLOUT) {
    return true;
  }
  if (listNodeTypes.includes(type)) {
    return typeof block.body === "object" && block.body !== null;
  }
  return simpleTextNodeTypeList.includes(type) && typeof block.body === "string";
}

/**
 * The id of the first of a note's blocks that can take a caret, skipping
 * blocks with no text input such as dividers, or undefined when none can.
 */
export function findFirstCaretBlockId(
  blocks:
    | readonly { id?: IRecordId; contentType?: NodeType; body?: unknown }[]
    | undefined
) {
  return blocks?.find(canBlockTakeCaret)?.id;
}
