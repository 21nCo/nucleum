import { tick } from "svelte";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

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
