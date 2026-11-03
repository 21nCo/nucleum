import { time } from "@datafn/client";
import { toSvelteStore } from "@datafn/svelte";
import { datafn } from "@nucleum/datafn/datafn.store";
import { isSameResource } from "@nucleum/datafn/resource.utils";
import type { IObjectiveThumb } from "@nucleum/features/focus/goals/goal.type";
import { resolveObjectiveColor } from "@nucleum/features/focus/goals/goal.utils";
import type { ISessionLog } from "@nucleum/features/focus/logs/log.type";

/** Quick focus item: a pinned objective with its color and today's focus. */
export type QuickFocusItem = IObjectiveThumb & { focus: number };

/** Live objectives pinned for quick focus. */
export function createPinnedQuickFocusStore() {
  return toSvelteStore<IObjectiveThumb[]>(
    datafn.objective.signal({
      select: ["*", "parent.*"],
      filters: {
        id: { $ne: "" },
        isPinnedForQuickFocus: true
      },
      metadata: {
        includeTrashed: true,
        includeArchived: true
      }
    }),
    { initialData: [] }
  );
}

/** Live session logs that started today. */
export function createTodayFocusLogStore() {
  return toSvelteStore<ISessionLog[]>(
    datafn.sessionLog.signal({
      select: ["id", "objectiveId", "focus", "breakTime", "startUnix"],
      temporal: time.day("startUnix", new Date())
    }),
    { initialData: [] }
  );
}

/** Total focus seconds across the given session logs. */
export function sumFocus(logs: Pick<ISessionLog, "focus">[]) {
  return logs.reduce((total, log) => total + (log.focus ?? 0), 0);
}

/**
 * Pairs each pinned objective with its color and today's focus, ordered by
 * color and then label, with uncolored objectives last.
 */
export function resolveQuickFocusItems(
  objectives: IObjectiveThumb[],
  logs: Pick<ISessionLog, "objectiveId" | "focus">[]
): QuickFocusItem[] {
  return objectives
    .map((objective) => ({
      ...objective,
      color: resolveObjectiveColor(objective),
      focus: sumFocus(
        logs.filter((log) =>
          log.objectiveId
            ? isSameResource(log.objectiveId, objective.id)
            : false
        )
      )
    }))
    .sort((a, b) => {
      if (a.color === b.color) {
        return (a.label ?? "").localeCompare(b.label ?? "");
      }
      if (a.color === undefined) return 1;
      if (b.color === undefined) return -1;
      return a.color - b.color;
    });
}
