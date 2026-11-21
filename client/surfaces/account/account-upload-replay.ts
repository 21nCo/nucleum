import type { AuthSessionResolution } from "@nucleum/client/runtime/account/auth.type";
import { logger } from "@nucleum/client/runtime/logging/logger";

/**
 * Starts the signed-in cloud account's upload replay once its stored session
 * resolves as live (`authenticated`) or as the cached cloud session an offline
 * startup restores (`cached-cloud`), without waiting for a page that renders
 * or captures a file (see the files runtime's startAccountUploadReplay). Any
 * other resolution (offline-only, expired, signed-out or unavailable) starts
 * nothing. The caller does not wait for the FileFn client to load.
 */
export function startUploadReplayForSession(
  resolution: Pick<AuthSessionResolution, "status">
): void {
  if (
    resolution.status !== "authenticated" &&
    resolution.status !== "cached-cloud"
  ) {
    return;
  }
  import("@nucleum/shared-state/files/filefn-client")
    .then((files) => files.startAccountUploadReplay())
    .catch((error: unknown) => {
      logger.error({ at: "account.uploadReplay.start", error });
    });
}
