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

/**
 * Whether a pane shows an editable editor of the note, which is not the case
 * while the note is read-only or still loading, or while a side panel takes
 * the place of its content in a narrow pane.
 */
export function hasNoteEditorFocus(id: IRecordId, paneId: string) {
  return focusers.has(focuserKey(id, paneId));
}

/**
 * Puts the caret in a note's editor in one pane. Does nothing when that pane
 * shows no editable editor of the note.
 */
export function focusNoteEditor(id: IRecordId, paneId: string) {
  focusers.get(focuserKey(id, paneId))?.();
}
