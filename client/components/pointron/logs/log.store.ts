import {
  attachTimeToDate,
  formatTime,
  isSameDay
} from "$lib/client/utils/time.utils";
import { currentTime, userPreferences } from "$lib/client/stores/app.store";
import { get, writable } from "svelte/store";
import { Item } from "$lib/client/types/item.enum";
import {
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { generateSessionId, generateUID } from "$lib/client/utils/utils";
import { logger } from "$lib/client/stores/log.store";
import { prefixTable } from "$lib/client/utils/text.utils";
import { pointronEvents, userLocalPreferences } from "../local.store";
import { dataManager } from "$lib/client/stores/data.store";
import { toasts } from "$lib/client/stores/notification.store";
import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
import {
  SessionType,
  type DaySummary,
  type LogThumbnail,
  type LogsPaneStore,
  type IManualSessionLogForm,
  type PointLogDbType,
  type PointLogStore,
  type PointSessionDbType
} from "./log.type";
import type {
  FocusItemsStore,
  FocusLog,
  SessionStore
} from "$lib/client/types/pointron/session.type";
import {
  calculateTotalFocusAndBreak,
  sessionTotals
} from "$lib/client/components/pointron/local.utils";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { NodeType } from "$lib/client/types/memotron/node.type";

export const pointLogStore = initPointLogStore();

function initPointLogStore() {
  const { subscribe, set, update } = writable<PointLogStore>();
  const reset = () => {
    set({
      id: Item.PointLog,
      dataType: StoreDataType.FIR,
      mutatingResources: [Item.PointSession, Item.PointLog],
      manualLogs: []
    });
  };
  reset();
  function generateNewLog(goalId: string | undefined = undefined) {
    const userGlobalPreferences = get(userPreferences);
    let newLog: IManualSessionLogForm = {
      startDate: new Date(), //.toISOString().split("T")[0],
      endDate: new Date(), //.toISOString().split("T")[0],
      endTime: formatTime(userGlobalPreferences, get(currentTime), "24")!,
      startTime: formatTime(userGlobalPreferences, get(currentTime), "24")!,
      id: generateUID(),
      goalId: goalId ?? "",
      duration: 0,
      notes: {
        blocks: [
          {
            id: generateUID(),
            contentType: NodeType.SIMPLE_TEXT,
            body: ""
          }
        ]
      }
    };
    return newLog;
  }
  return {
    subscribe,
    set,
    update,
    addNewManualLog: (goalId?: string) => {
      update((n) => {
        let newLog = generateNewLog(goalId);
        n.manualLogs.push(newLog);
        return n;
      });
    },
    removeManualLog: (logId: string) => {
      update((n) => {
        n.manualLogs = n.manualLogs.filter((x) => x.id != logId);
        return n;
      });
    },
    updateManualLog: (log: IManualSessionLogForm) => {
      update((n) => {
        let index = n.manualLogs.findIndex((x) => x.id == log.id);
        n.manualLogs[index] = log;
        return n;
      });
    },
    saveManualLogs: async () => {
      let n = get(pointLogStore);
      logger.log({ context: "saving manual logs", n });
      let sessionEntries: PointSessionDbType[] = [];
      let logEntries: PointLogDbType[] = [];
      n.manualLogs.forEach((entry) => {
        const duration = entry.duration;
        let start = attachTimeToDate(entry.startDate, entry.startTime);
        let end = attachTimeToDate(entry.endDate, entry.endTime);
        const id = generateSessionId(start.getTime());
        const log: PointLogDbType = {
          start: start.toISOString(),
          end: end.toISOString(),
          id: prefixTable(id, Item.PointLog),
          sessionId: prefixTable(id, Item.PointSession),
          totalFocus: duration,
          totalBreak: 0,
          goalId: entry.goalId,
          manualEntryId: entry.id,
          tzOffset: get(userPreferences).timeZoneOffset,
          targets: get(userLocalPreferences).horizonTargets
        };
        const session: PointSessionDbType = {
          start: start.toISOString(),
          end: end.toISOString(),
          elapsed: duration,
          id: prefixTable(id, Item.PointSession),
          manualEntryId: entry.id,
          logs: [{ ...log, start: start.getTime(), end: end.getTime() }],
          blocks: [],
          notes: entry.notes ?? {
            blocks: []
          },
          tasks: [
            {
              label: "Manual Entry",
              estimated: duration,
              worked: duration,
              order: 0,
              checked: true,
              goalId: entry.goalId
            }
          ],
          type: SessionType.MANUAL_ENTRY,
          extended: 0
        };
        sessionEntries.push(session);
        logEntries.push(log);
      });
      // const response = await focusPersistance.saveManualLogs(
      //   sessionEntries,
      //   logEntries
      // );
      await dataManager.performMutation(
        Item.PointLog,
        { sessionEntries, logEntries },
        {
          action: PersistanceActionType.CUSTOM_QUERY,
          query:
            "fn::pointron::focus::saveManualLogs($sessionEntries, $logEntries);"
        }
      );
      reset();
      toasts.success("Manual log added successfully");
      pointronEvents.notify(PointronEventEnum.REFRESH_QUICK_FOCUS, true);
      pointronEvents.notify(PointronEventEnum.REFRESH_LOGS, true);
    },
    reset,
    deleteLog: async (id: string) => {
      return dataManager.performMutation(
        Item.PointLog,
        { id },
        {
          action: PersistanceActionType.CUSTOM_QUERY,
          query: "return fn::pointron::log::delete($id);"
        }
      );
    },
    /**
     * Saves focus logs to the database. This function is called when user finishes a focus session delegated from focus store.
     * @param focusStore
     * @param focusItemStore
     * @param isClose
     */
    finishFocus: (
      focusStore: SessionStore,
      focusItemStore: FocusItemsStore,
      isClose: boolean
    ) => {
      const m: PointSessionDbType = {
        elapsed: focusStore.totalElapsed,
        extended: focusStore.totalExtended,
        start: focusStore.start?.toISOString() ?? "",
        end: new Date(
          (focusStore.start?.getTime() ?? 0) + focusStore.totalElapsed * 1000
        ).toISOString(),
        id: prefixTable(
          focusStore.currentSessionId ??
            generateSessionId(new Date().getTime()),
          Item.PointSession
        ),
        type: focusStore.type,
        blocks: focusStore.blocks,
        logs: focusStore.logs,
        tasks: focusItemStore.items,
        notes: focusStore.notes
      };
      const totalFocusFromLogs = focusStore.logs.reduce(
        (a, b) => a + (b.totalFocus ?? 0),
        0
      );
      const totalBreakFromLogs = focusStore.logs.reduce(
        (a, b) => a + (b.totalBreak ?? 0),
        0
      );
      const sessionTotals = calculateTotalFocusAndBreak(focusStore.blocks);
      if (
        sessionTotals.focus - totalFocusFromLogs >= 1 ||
        sessionTotals.brek - totalBreakFromLogs >= 1
      ) {
        focusStore.logs.push({
          start: focusStore.start?.getTime() ?? 0,
          end: focusStore.end?.getTime() ?? new Date().getTime(),
          taskId: "",
          goalId: "PointGoal:NonGoal",
          taskName: "",
          totalFocus: sessionTotals.focus - totalFocusFromLogs,
          totalBreak: sessionTotals.brek - totalBreakFromLogs,
          blocks: []
        });
      }
      const logs: PointLogDbType[] = focusStore.logs.map((l: FocusLog) => {
        let taskName = focusItemStore.items.find(
          (x) => x.taskId == l.taskId
        )?.label;
        if (!l.goalId) {
          l.goalId = "PointGoal:NonGoal";
        }
        return {
          ...l,
          id: prefixTable(l.start, Item.PointLog),
          start: new Date(l.start).toISOString(),
          end: new Date(l.end!).toISOString(),
          sessionId: m.id,
          taskName,
          tzOffset: get(userPreferences).timeZoneOffset,
          targets: get(userLocalPreferences).horizonTargets
        };
      });
      dataManager.performMutation(
        Item.PointLog,
        {
          sessionData: m,
          logs,
          snapshot: { ...focusStore, id: prefixTable(focusStore.id, Item.kv) },
          isClose
        },
        {
          action: PersistanceActionType.CUSTOM_QUERY,
          query:
            "fn::pointron::focus::finish::v4($sessionData, $logs, $snapshot, $isClose);"
        }
      );
    }
  };
}

const seedLogsPaneStore: LogsPaneStore = {
  id: Item.logsPane,
  dataType: StoreDataType.KVO,
  logs: [],
  summary: { focus: 0, break: 0 },
  date: new Date()
};
export const logsPaneStore = initLogsPaneStore();

function initLogsPaneStore() {
  const { subscribe, set, update } = writable<LogsPaneStore>(seedLogsPaneStore);

  /**
   * Generates a summary of the logs
   * @param logs LogThumbnail[]
   * @returns DaySummary
   */
  const generateSummary = (logs: LogThumbnail[]): DaySummary => {
    let focus = 0;
    let breakTime = 0;
    logs.forEach((x) => {
      focus += x.totalFocus;
      breakTime += x.totalBreak;
    });
    return { focus, break: breakTime };
  };
  return {
    subscribe,
    set,
    update,
    reset: () => {
      console.log("resetting logsPaneStore");
      update((n) => {
        n.date = new Date();
        return n;
      });
    },
    loader: (data: any) => {
      const n = get(logsPaneStore);
      console.log({ context: "logsPaneStore.loader", data });
      let logs = [];
      if (data && data.length > 0) {
        logs = data.map((x: any) => {
          const { totalFocus, totalBreak } = sessionTotals(x);
          return { ...x, totalFocus, totalBreak };
        });
      } else {
        logs = [];
      }
      n.summary = generateSummary(logs);
      set({ ...n, logs });
    },
    resolveRefreshQuery: () => {
      const n = get(logsPaneStore);
      return replaceParams("return fn::pointron::logs::fetch::v3($date);", {
        date: n.date.toISOString()
      });
    },
    refresh: (date: Date) => {
      const n = get(logsPaneStore);
      // console.log({
      //   context: "logsPaneStore.refresh",
      //   date,
      //   storeDate: new Date(n.date),
      //   n
      // });
      if ((isSameDay(date, n.date) && n.logs.length > 0) || n.isPageRefreshing)
        return n;
      n.date = new Date(date);
      set(n);
      return dataManager.refresh(Item.logsPane, true);
    }
  };
}
