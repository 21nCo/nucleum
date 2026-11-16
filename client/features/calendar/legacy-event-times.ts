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

type LegacyEventRecord = {
  id?: unknown;
  startUnix?: unknown;
  endUnix?: unknown;
  value?: unknown;
};

/**
 * The top-level times a legacy event is missing but still keeps inside
 * `value`, or undefined when there is nothing to lift. Each time is lifted
 * on its own, so an event that has a top-level start but kept its end only
 * in `value` gets its end back. Calendar queries filter on the top-level
 * fields, and servers can't filter inside JSON.
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
  return Object.keys(lifted).length > 0 ? lifted : undefined;
}

/** Whether a DataFn mutation result reports a rejected write. */
function isFailedMutation(result: unknown) {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as { ok?: unknown }).ok === false
  );
}

/**
 * Lifts the times of events whose `field` is empty, one page at a time in
 * id order, until the last page. Repaired events leave the filter, so each
 * page starts after the events that had nothing to lift; every page either
 * repairs records or moves past them, so the scan always ends. Throws when a write is rejected, so the run is
 * not recorded and is retried on the next start.
 */
async function liftEventTimesWhereEmpty(
  field: "startUnix" | "endUnix"
): Promise<number> {
  let repaired = 0;
  let unrepairable = 0;
  for (;;) {
    const result = await datafn.event.query({
      select: ["id", "startUnix", "endUnix", "value"],
      filters: { [field]: { $is_null: true } },
      sort: ["id"],
      metadata: { includeTrashed: true, includeArchived: true },
      limit: repairPageSize,
      offset: unrepairable
    });
    const records = (result.data ?? []) as LegacyEventRecord[];
    const writes = records.flatMap((record) => {
      const lifted = resolveLiftedEventTimes(record);
      return typeof record.id === "string" && lifted?.[field] !== undefined
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
      const outcome = await datafn.event.mutate(writes as any);
      const outcomes = Array.isArray(outcome) ? outcome : [outcome];
      if (outcomes.some(isFailedMutation)) {
        throw new Error("Some legacy event times could not be saved");
      }
      repaired += writes.length;
    }
    unrepairable += records.length - writes.length;
    if (records.length < repairPageSize) break;
  }
  return repaired;
}

/**
 * Lifts `value.startUnix`/`value.endUnix` to the top-level fields of events
 * stored before imports did it, so calendar queries find them again (and
 * multi-day events keep their end). Writes go through DataFn as system
 * changes, so they sync; the repair is idempotent and reads only events
 * missing a top-level start or end time.
 *
 * @returns The number of events repaired.
 */
async function runLegacyEventTimeRepair(): Promise<number> {
  const repaired =
    (await liftEventTimesWhereEmpty("startUnix")) +
    (await liftEventTimesWhereEmpty("endUnix"));
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
