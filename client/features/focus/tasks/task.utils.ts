import { TaskDueDateFilter, TaskSubTypeForSwitcher } from "@nucleum/features/focus/tasks/task.type";

export function resolveTaskSubTypesForSwitcher() {
  const byDate = {
    label: "By date",
    value: TaskSubTypeForSwitcher.BY_DATE
  };
  const byMonth = {
    label: "By month",
    value: TaskSubTypeForSwitcher.BY_MONTH
  };
  return [byDate, byMonth];
}

export function resolveTaskDueDateFilters(params?: {
  isDatedContext?: boolean;
}) {
  const withoutDueDate = {
    label: "Without due date",
    value: TaskDueDateFilter.WITHOUT_DUE_DATE,
    icon: "question"
  };
  return [
    {
      label: "All",
      value: TaskDueDateFilter.ALL,
      icon: "asterisk"
    },
    {
      label: "Overdue",
      value: TaskDueDateFilter.OVERDUE,
      icon: "alarm"
    },
    ...(!params?.isDatedContext ? [withoutDueDate] : [])
  ];
}

/**
 * Filter for tasks without a due date. Tasks store `dateUnix: 0` when they
 * have no date (migrated rows can hold `null`); `$lte: 0` matches both in the
 * local executor and is pushed down to SQL as a numeric comparison, unlike an
 * equality with `false`, which Postgres rejects for a numeric column.
 */
export function resolveTaskWithoutDueDateFilter() {
  return { $lte: 0 };
}

/**
 * Filter for tasks without an objective. Tasks created in the app store an
 * empty `objectiveId` while migrated rows hold `null`; `$is_empty` matches
 * both, unlike an equality with `false`, which Postgres rejects for a text
 * column.
 */
export function resolveTaskWithoutObjectiveFilter() {
  return { $is_empty: true };
}

/** Task fields stored as numbers, which a direct-mode read returns as numeric strings. */
const TASK_NUMBER_FIELDS = [
  "dateUnix",
  "completedAtUnix",
  "estimated",
  "minutes"
] as const;

/**
 * Turns the numeric strings of a task's number fields into numbers. In
 * direct mode Postgres returns `numeric` columns as strings, so
 * `new Date(task.dateUnix)` is invalid and `"0"` reads as a set date.
 * Returns the same record when nothing needs converting.
 */
export function normalizeTaskNumberFields<T extends object>(record: T): T {
  let result: T | undefined;
  for (const field of TASK_NUMBER_FIELDS) {
    const value = (record as Record<string, unknown>)[field];
    if (typeof value !== "string" || value.trim() === "") continue;
    const number = Number(value);
    if (!Number.isFinite(number)) continue;
    result ??= { ...record };
    (result as Record<string, unknown>)[field] = number;
  }
  return result ?? record;
}
