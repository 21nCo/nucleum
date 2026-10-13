import { type IActiveSessionStore } from "@nucleum/features/focus/session.type";
import { toDateValue } from "@21n/shared-utils/datetime/date-arithmetic";

/** Normalizes supported persisted session date representations. */
export function resolveSessionDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : undefined;
  }
  const fromKnown = toDateValue(
    value as Date | string | number | undefined | null
  );
  if (fromKnown) return fromKnown;
  if (value && typeof value === "object") {
    if (typeof (value as { getTime?: unknown }).getTime === "function") {
      const timestamp = (value as Date).getTime();
      if (Number.isFinite(timestamp)) return new Date(timestamp);
    }
    const record = value as Record<string, unknown>;
    for (const key of [
      "value",
      "date",
      "iso",
      "datetime",
      "$date",
      "epochMs",
      "ms"
    ]) {
      const nested = toDateValue(
        record[key] as Date | string | number | undefined | null
      );
      if (nested) return nested;
    }
    const parsed = new Date(String(value));
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return undefined;
}

/** Normalizes hydrated session timestamps and numeric counters. */
export function normalizeSavedSessionStore(
  savedSessionStore: IActiveSessionStore
): IActiveSessionStore {
  const normalized = { ...savedSessionStore };
  const start = resolveSessionDate(savedSessionStore.start);
  if (start) {
    normalized.start = start;
  }
  const end = resolveSessionDate(savedSessionStore.end);
  if (end) {
    normalized.end = end;
  }
  normalized.intervals = Array.isArray(savedSessionStore.intervals)
    ? savedSessionStore.intervals.map((interval) => ({
        ...interval,
        start: resolveSessionNumber(interval?.start),
        duration: resolveSessionNumber(interval?.duration),
        progress: resolveSessionNumber(interval?.progress)
      }))
    : [];
  if (savedSessionStore.currentFocusItem) {
    normalized.currentFocusItem = {
      ...savedSessionStore.currentFocusItem,
      start: resolveSessionNumber(savedSessionStore.currentFocusItem.start)
    };
  }
  if (typeof savedSessionStore.timeElapsed !== "number") {
    normalized.timeElapsed = resolveSessionNumber(
      savedSessionStore.timeElapsed
    );
  }
  if (typeof savedSessionStore.totalElapsed !== "number") {
    normalized.totalElapsed = resolveSessionNumber(
      savedSessionStore.totalElapsed
    );
  }
  if (typeof savedSessionStore.plannedDuration !== "number") {
    normalized.plannedDuration = resolveSessionNumber(
      savedSessionStore.plannedDuration
    );
  }
  if (typeof savedSessionStore.totalIdle !== "number") {
    normalized.totalIdle = resolveSessionNumber(savedSessionStore.totalIdle);
  }
  if (typeof savedSessionStore.totalExtended !== "number") {
    normalized.totalExtended = resolveSessionNumber(
      savedSessionStore.totalExtended
    );
  }
  if (typeof savedSessionStore.currentIdle !== "number") {
    normalized.currentIdle = resolveSessionNumber(
      savedSessionStore.currentIdle
    );
  }
  if (
    savedSessionStore.timeRemainingToTakeBreak !== undefined &&
    typeof savedSessionStore.timeRemainingToTakeBreak !== "number"
  ) {
    normalized.timeRemainingToTakeBreak = resolveSessionNumber(
      savedSessionStore.timeRemainingToTakeBreak
    );
  }
  return normalized;
}

/** Normalizes supported persisted session counter representations. */
export function resolveSessionNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
    const dateValue = new Date(value).getTime();
    if (Number.isFinite(dateValue)) {
      return dateValue;
    }
  }
  if (value && typeof value === "object") {
    const timestamp = resolveSessionDate(value)?.getTime();
    if (timestamp && Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return 0;
}
