export const e2eAuthModes = ["cloud", "offline", "cloud-only"] as const;

export type E2EAuthMode = (typeof e2eAuthModes)[number];

function normalizeAuthMode(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * Resolve the E2E authentication mode from runtime environment.
 */
export function resolveE2EAuthMode(
  env: Record<string, string | undefined> = process.env
): E2EAuthMode {
  const rawMode = env.E2E_AUTH_MODE;
  if (!rawMode?.trim()) {
    return "offline";
  }
  const mode = normalizeAuthMode(rawMode);
  if (isE2EAuthMode(mode)) return mode;
  throw new Error(
    `Invalid E2E_AUTH_MODE "${rawMode}". Expected one of: ${e2eAuthModes.join(", ")}.`
  );
}

/**
 * Check whether a value is a supported E2E auth mode.
 */
export function isE2EAuthMode(value: string): value is E2EAuthMode {
  return e2eAuthModes.includes(value as E2EAuthMode);
}

/**
 * Return true for modes that require an AuthFn cloud session.
 */
export function isE2ECloudAuthMode(mode: E2EAuthMode): boolean {
  return mode === "cloud" || mode === "cloud-only";
}

/**
 * Return true for cloud mode without local offlinability.
 */
export function isE2ECloudOnlyAuthMode(mode: E2EAuthMode): boolean {
  return mode === "cloud-only";
}

/**
 * Return true for offline-only mode.
 */
export function isE2EOfflineAuthMode(mode: E2EAuthMode): boolean {
  return mode === "offline";
}
