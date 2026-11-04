/** Saves pending edits for a resource and reports whether edit mode may close. */
export type EditModeFinisher = () => Promise<boolean>;

const finishers = new Map<string, EditModeFinisher>();

/**
 * Registers how a resource's open editor finishes, for example by saving a
 * title draft, so a Done control closes edit mode only after the save.
 * Returns the release function.
 */
export function registerEditModeFinisher(
  resourceId: string,
  finish: EditModeFinisher
) {
  finishers.set(resourceId, finish);
  return () => {
    if (finishers.get(resourceId) === finish) finishers.delete(resourceId);
  };
}

/**
 * Finishes a resource's registered editor, then closes edit mode only when
 * that succeeded. Without a registered editor it closes right away.
 */
export async function finishEditMode(resourceId: string, close: () => void) {
  const finish = finishers.get(resourceId);
  if (finish && !(await finish())) return;
  close();
}
