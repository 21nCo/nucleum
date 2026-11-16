import { clientStorage } from "@nucleum/persistence/client-storage";
import type { ClientStorageKey } from "@nucleum/persistence/persistence.type";

/** Reads the per-namespace last-run times stored under `key`. */
async function readLastRuns(
  key: ClientStorageKey
): Promise<Record<string, number>> {
  const stored = await clientStorage.get(key).catch(() => null);
  try {
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Whether a start-up maintenance task stored under `key` is due for
 * `namespace`: it never ran there, or its last successful run is at least
 * `intervalMs` old.
 */
export async function isMaintenanceDue(params: {
  key: ClientStorageKey;
  namespace: string;
  intervalMs: number;
  now?: number;
}) {
  const lastRun = (await readLastRuns(params.key))[params.namespace];
  return (
    typeof lastRun !== "number" ||
    (params.now ?? Date.now()) - lastRun >= params.intervalMs
  );
}

/** Records a successful run of the maintenance task under `key` for `namespace`. */
export async function recordMaintenanceRun(params: {
  key: ClientStorageKey;
  namespace: string;
  now?: number;
}) {
  const lastRuns = await readLastRuns(params.key);
  lastRuns[params.namespace] = params.now ?? Date.now();
  await clientStorage
    .set(params.key, JSON.stringify(lastRuns))
    .catch(() => undefined);
}

/**
 * Throws when a DataFn mutation outcome (a result or a list of results)
 * reports a rejected write. Writes can be rejected without throwing; a
 * maintenance run must fail then, so it is not recorded and runs again.
 */
export function assertMaintenanceWritesSucceeded(
  outcome: unknown,
  task: string
) {
  const outcomes = Array.isArray(outcome) ? outcome : [outcome];
  const isRejected = outcomes.some(
    (result) =>
      typeof result === "object" &&
      result !== null &&
      (result as { ok?: unknown }).ok === false
  );
  if (isRejected) throw new Error(`${task}: a write was rejected`);
}
