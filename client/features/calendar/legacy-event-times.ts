import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import {
  isMaintenanceDue,
  recordMaintenanceRun
} from "@nucleum/datafn/maintenance-schedule";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { logger } from "@nucleum/client/runtime/logging/logger";

const repairIntervalMs = 24 * 60 * 60 * 1000;
const repairPageSize = 200;
const maxRepairPages = 50;

type LegacyEventRecord = {
  id?: unknown;
  startUnix?: unknown;
  endUnix?: unknown;
  value?: unknown;
};

/**
 * The top-level times a legacy event is missing but still keeps inside
 * `value`, or undefined when there is nothing to lift. Calendar queries
 * filter on the top-level fields, and servers can't filter inside JSON.
 */
export function resolveLiftedEventTimes(
  record: LegacyEventRecord
): { startUnix?: number; endUnix?: number } | undefined {
  const value =
    typeof record.value === "object" && record.value !== null
      ? (record.value as Record<string, unknown>)
      : undefined;
  const lifted: { startUnix?: number; endUnix?: number } = {};
  if (
    typeof record.startUnix !== "number" &&
    typeof value?.startUnix === "number"
  ) {
    lifted.startUnix = value.startUnix;
  }
  if (
    typeof record.endUnix !== "number" &&
    typeof value?.endUnix === "number"
  ) {
    lifted.endUnix = value.endUnix;
  }
  return lifted.startUnix === undefined ? undefined : lifted;
}

/**
 * Lifts `value.startUnix`/`value.endUnix` to the top-level fields of events
 * stored before imports did it, so calendar queries find them again. Writes
 * go through DataFn as system changes, so they sync; the repair is
 * idempotent and reads only events without a top-level start time. Repaired
 * events leave that filter, so each page starts after the events that had
 * nothing to lift.
 *
 * @returns The number of events repaired.
 */
async function runLegacyEventTimeRepair(): Promise<number> {
  let repaired = 0;
  let unrepairable = 0;
  for (let page = 0; page < maxRepairPages; page++) {
    const result = await datafn.event.query({
      select: ["id", "startUnix", "endUnix", "value"],
      filters: { startUnix: { $is_null: true } },
      metadata: { includeTrashed: true, includeArchived: true },
      limit: repairPageSize,
      offset: unrepairable
    });
    const records = (result.data ?? []) as LegacyEventRecord[];
    const writes = records.flatMap((record) => {
      const lifted = resolveLiftedEventTimes(record);
      return typeof record.id === "string" && lifted
        ? [
            {
              operation: "merge" as const,
              id: record.id,
              record: { id: record.id, ...lifted },
              system: true
            }
          ]
        : [];
    });
    if (writes.length > 0) {
      await datafn.event.mutate(writes as any);
      repaired += writes.length;
    }
    unrepairable += records.length - writes.length;
    if (records.length < repairPageSize) break;
  }
  if (repaired > 0) {
    logger.info({ at: "repairLegacyEventTimes", repaired });
  }
  return repaired;
}

/**
 * Runs the legacy event-time repair at most once a day per namespace,
 * recording the run only once it succeeds, so a failed attempt is retried on
 * the next start. Runs in every mode: direct mode reads and writes the
 * server's copy.
 */
export async function repairLegacyEventTimesIfDue(
  now = Date.now()
): Promise<number> {
  const namespace = get(datafnRuntime)?.namespace;
  if (!namespace) return 0;
  const key = ClientStorageKey.LEGACY_EVENT_TIME_REPAIR_AT;
  if (
    !(await isMaintenanceDue({
      key,
      namespace,
      intervalMs: repairIntervalMs,
      now
    }))
  ) {
    return 0;
  }
  try {
    const repaired = await runLegacyEventTimeRepair();
    await recordMaintenanceRun({ key, namespace, now });
    return repaired;
  } catch (error) {
    logger.error({ at: "repairLegacyEventTimes", error });
    return 0;
  }
}
