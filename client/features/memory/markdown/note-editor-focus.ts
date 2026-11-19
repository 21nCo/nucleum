import type { IRecordId } from "@nucleum/schema/legacy/data.type";

/** Focus entry points of the open, editable note editors, by pane and note. */
const focusers = new Map<string, () => void>();

function focuserKey(id: IRecordId, paneId: string) {
  return JSON.stringify([paneId, id.toString()]);
}

/**
 * Registers how a note's editor in a pane takes focus, replacing an earlier
 * registration there. Returns the release, which removes the registration
 * only while it is still this one, so a remounted editor keeps its own.
 */
export function registerNoteEditorFocus(
  id: IRecordId,
  paneId: string,
  focus: () => void
) {
  const key = focuserKey(id, paneId);
  focusers.set(key, focus);
  return () => {
    if (focusers.get(key) === focus) focusers.delete(key);
  };
}

/** How long a request to focus a not yet shown editor stays valid, in ms. */
const PENDING_FOCUS_TTL_MS = 3000;

/** Focus requests waiting for their editor to be shown, with their expiry. */
const pendingFocus = new Map<string, number>();

/**
 * Puts the caret in a note's editor in one pane. While that pane shows no
 * editable editor of the note, such as under a side panel in a narrow pane,
 * runs `reveal` to bring the editor back and keeps the request, which
 * {@link runPendingNoteEditorFocus} runs once the editor is shown and the
 * navigation behind `reveal` has settled, as that navigation resets focus.
 * Does nothing without `reveal` then.
 */
export function focusNoteEditor(
  id: IRecordId,
  paneId: string,
  reveal?: () => void
) {
  const key = focuserKey(id, paneId);
  const focus = focusers.get(key);
  if (focus) {
    pendingFocus.delete(key);
    focus();
    return;
  }
  if (!reveal) return;
  pendingFocus.set(key, Date.now() + PENDING_FOCUS_TTL_MS);
  reveal();
}

/**
 * Runs the focus request waiting for a pane's note editor, if it has not
 * expired and the editor is shown. Returns whether it focused the editor.
 */
export function runPendingNoteEditorFocus(id: IRecordId, paneId: string) {
  const key = focuserKey(id, paneId);
  const expiry = pendingFocus.get(key);
  if (expiry === undefined) return false;
  const focus = focusers.get(key);
  if (!focus) return false;
  pendingFocus.delete(key);
  if (Date.now() > expiry) return false;
  focus();
  return true;
}
