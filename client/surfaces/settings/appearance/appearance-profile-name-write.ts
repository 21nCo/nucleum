export type ProfileNameWriteResult = { ok: boolean } | undefined;

export const PROFILE_NAME_SAVE_FAILED_MESSAGE =
  "Couldn't save the profile. Try again.";
export const PROFILE_NAME_MISSING_MESSAGE = "This profile no longer exists.";

/**
 * Runs a profile name write (new profile or rename) and resolves whether the
 * name editor can close. A rejected or unsuccessful write keeps the editor
 * open so the typed name can be retried. An undefined result means the
 * profile no longer exists, so there is nothing left to edit.
 */
export async function runProfileNameWrite(
  write: () => PromiseLike<ProfileNameWriteResult> | ProfileNameWriteResult,
  onError: (message: string) => void
): Promise<boolean> {
  let result: ProfileNameWriteResult;
  try {
    result = await write();
  } catch {
    onError(PROFILE_NAME_SAVE_FAILED_MESSAGE);
    return false;
  }
  if (result === undefined) {
    onError(PROFILE_NAME_MISSING_MESSAGE);
    return true;
  }
  if (!result.ok) {
    onError(PROFILE_NAME_SAVE_FAILED_MESSAGE);
    return false;
  }
  return true;
}
