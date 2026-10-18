import { Resource } from "@nucleum/datafn/resource.enum";
import {
  type IActiveSessionStore,
  BlockType,
  type IFocusItemsStore,
  type IFocusItem
} from "@nucleum/features/focus/session.type";
import { resolveSessionTimeSplit } from "@nucleum/features/focus/composition.utils";
import { deepCopy } from "@21n/shared-utils/obj.utils";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  SessionType,
  type ISessionCapture,
  type ISessionLogCapture
} from "@nucleum/features/focus/logs/log.type";
import {
  determineResourceType,
  resourceInList
} from "@nucleum/datafn/resource.utils";
import {
  resolveTaskFocus,
  resolveTotalTaskTime
} from "@nucleum/features/focus/session.utils";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";

/** Builds durable session and log records from the final focus snapshot. */
export function buildSessionCompletion(
  activeSessionVal: IActiveSessionStore,
  focusItemStore: IFocusItemsStore,
  params?: { end?: number }
) {
  const plannedEndTime = resolvePlannedEndTime(activeSessionVal);
  const endTime =
    plannedEndTime && new Date().getTime() > plannedEndTime.getTime()
      ? plannedEndTime
      : new Date(params?.end ?? new Date().getTime());

  const session: ISessionCapture = {
    elapsed: activeSessionVal.totalElapsed,
    extended: activeSessionVal.totalExtended,
    startUnix: activeSessionVal.start
      ? resolveUnixTimestamp(activeSessionVal.start)
      : 0,
    endUnix: resolveUnixTimestamp(endTime),
    plannedEndUnix: plannedEndTime
      ? resolveUnixTimestamp(plannedEndTime)
      : undefined,
    id:
      activeSessionVal.currentSessionId ?? generateResourceId(Resource.session),
    type: activeSessionVal.type,
    blocks: [
      ...activeSessionVal.intervals,
      {
        id: generateSimpleRandomId(),
        start: endTime.getTime(),
        type: BlockType.NONE,
        progress: 0,
        duration: 0
      }
    ],
    notes: activeSessionVal.notes
  };
  const logs: ISessionLogCapture[] = [];

  const allItems = [
    ...focusItemStore.items,
    ...(focusItemStore.removedItems ?? [])
  ];

  allItems.forEach((item: IFocusItem) => {
    const resourceType = determineResourceType(item.id);
    const objectiveId =
      resourceType === Resource.objective
        ? item.id
        : (item.parentObjectiveId ??
          allItems.find((x) => x.tasks?.some(resourceInList(item.id)))?.id ??
          "");
    const taskId = resourceType === Resource.task ? item.id : "";
    if (item.blocks && item.blocks.length > 0) {
      logs.push(
        ...item.blocks.map((block) => {
          return generateLogFromBlock(objectiveId, taskId, block);
        })
      );
    }
  });

  const totalTimeFromLogs = logs.reduce((acc, log) => {
    return acc + ((log.focus ?? 0) + (log.breakTime ?? 0));
  }, 0);

  const sessionTotals = resolveSessionTimeSplit(session);

  const remainingTime =
    sessionTotals.focus + sessionTotals.brek - totalTimeFromLogs;
  if (remainingTime > 0) {
    logs.push({
      id: generateResourceId(Resource.sessionLog),
      startUnix: session.startUnix,
      endUnix: session.endUnix,
      sessionId: session.id,
      focus: remainingTime,
      breakTime: 0
    });
  }
  return { session, logs, allItems };
  function resolvePlannedEndTime(session: IActiveSessionStore) {
    if (session.type == SessionType.COUNTUP) {
      return;
    } else if (session.end) return session.end;
    else if (session.start) {
      return new Date(session.start.getTime() + session.plannedDuration * 1000);
    }
  }

  function generateLogFromBlock(
    objectiveId: IRecordId,
    taskId: IRecordId,
    block: { start: number; end: number }
  ): ISessionLogCapture {
    const total = resolveTotalTaskTime([block]);
    const focus = resolveTaskFocus(session.blocks, [block]);
    const breakTime = Number((total - focus).toFixed(1));
    logger.log({
      focus,
      blocks: deepCopy(session.blocks),
      total,
      block,
      breakTime
    });
    return {
      id: generateResourceId(Resource.sessionLog),
      startUnix: resolveUnixTimestamp(new Date(block.start)),
      endUnix: resolveUnixTimestamp(new Date(block.end)),
      sessionId: session.id,
      objectiveId,
      taskId,
      focus,
      breakTime
    };
  }
}
