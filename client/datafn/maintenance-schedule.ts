import { clientStorage } from "@nucleum/persistence/client-storage";
import type { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { logger } from "@nucleum/client/runtime/logging/logger";

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

/**
 * Runs a start-up maintenance task for `namespace` when it is due, and
 * records the run only once `run` succeeds, so a failed attempt is retried on
 * the next start. Errors are logged under `task`.
 *
 * DataFn can switch to another namespace while a run is in progress (a
 * re-initialisation for another account or mode). `run` gets an
 * `assertCurrent` check to call before each read and write, which throws once
 * `currentNamespace()` no longer returns `namespace`, so a run never reads one
 * namespace and writes another; the run then fails and is not recorded.
 *
 * @returns What `run` returned, or `fallback` when it didn't run or failed.
 */
export async function runMaintenanceIfDue<T>(params: {
  key: ClientStorageKey;
  namespace: string | undefined;
  currentNamespace: () => string | null | undefined;
  intervalMs: number;
  task: string;
  run: (assertCurrent: () => void) => Promise<T>;
  fallback: T;
  now?: number;
}): Promise<T> {
  const { key, namespace, currentNamespace, intervalMs, task, run, fallback } =
    params;
  const now = params.now ?? Date.now();
  if (!namespace) return fallback;
  if (!(await isMaintenanceDue({ key, namespace, intervalMs, now }))) {
    return fallback;
  }
  const assertCurrent = () => {
    if (currentNamespace() !== namespace) {
      throw new Error(`${task}: the DataFn namespace changed during the run`);
    }
  };
  try {
    const result = await run(assertCurrent);
    assertCurrent();
    await recordMaintenanceRun({ key, namespace, now });
    return result;
  } catch (error) {
    logger.error({ at: task, error });
    return fallback;
  }
}
