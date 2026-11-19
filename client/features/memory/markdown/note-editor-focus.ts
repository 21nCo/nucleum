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
  expiry: number;
  /**
   * Whether bringing the editor back started a navigation, whose end resets
   * focus, so only {@link runPendingNoteEditorFocus} after it may serve it.
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
 * registration there. A focus request waiting for this editor whose reveal
 * started no navigation, such as closing the cover picker or a panel switch
 * that left the URL as it was, is served once the editor has rendered.
 * Returns the release, which removes the registration only while it is
 * still this one, so a remounted editor keeps its own.
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
 * request until the editor is shown: at once when it registers if `reveal`
 * started no navigation, otherwise from {@link runPendingNoteEditorFocus}
 * once that navigation has settled, as its end resets focus. Does nothing
 * without `reveal` then.
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
  // Waits for a navigation until `reveal` says it started none, so an
  // editor shown while it runs is not focused before that navigation ends.
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
 * Runs the focus request waiting for a pane's note editor after a navigation
 * has settled, if it has not expired and the editor is shown. Returns
 * whether it focused the editor.
 */
export function runPendingNoteEditorFocus(id: IRecordId, paneId: string) {
  return servePendingFocus(focuserKey(id, paneId));
}

/**
 * What one pane's view of an open note knows about whether its editor takes
 * edits. It belongs to that pane alone: other views of the note share its
 * node store, so the store cannot hold it.
 */
export interface NotePaneEditor {
  /**
   * Records whether the pane's note content opened without some of its
   * blocks, which keeps its editor read-only.
   */
  setOpenedIncomplete(isOpenedIncomplete: boolean): void;
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
