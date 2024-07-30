import {
  attachTimeToDate,
  formatTime,
  isSameDay
} from "$lib/client/utils/time.utils";
import { currentTime, userPreferences } from "$lib/client/stores/app.store";
import { get, writable } from "svelte/store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { generateSessionId, generateUID } from "$lib/client/utils/utils";
import { logger } from "$lib/client/stores/log.store";
import { prefixTable } from "$lib/shared/utils/text.utils";
import { pointronPreferences } from "../pointron.store";
import { dataManager } from "$lib/client/persistence/dataManager";
import { appEvents, toasts } from "$lib/client/stores/notification.store";
import {
  SessionType,
  type DaySummary,
  type LogThumbnail,
  type ILogsPaneStore,
  type IManualSessionLogForm,
  type IPointLog,
  type IPointLogStore,
  type IPointSession
} from "./log.type";
import type {
  IFocusItemsStore,
  FocusLog,
  ISessionStore
} from "$lib/client/types/pointron/session.type";
import {
  calculateTotalFocusAndBreak,
  sessionTotals
} from "$lib/client/products/pointron/pointron.utils";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { NodeType } from "$lib/client/products/memotron/node/node.type";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import { ObservableStore } from "$lib/client/stores/client.store";
export const valid = writable(true)

class PointLogStore extends ObservableStore<IPointLogStore> {
  constructor() {
    super(Resource.PointLog, StoreDataType.NA, {
      mutatingResources: [Resource.PointSession, Resource.PointLog]
    });
  }
  reset() {
    this.set({
      manualLogs: []
    });
  }
  generateNewLog(goalId: string | undefined = undefined) {
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
  addNewManualLog(goalId?: string) {
    this.update((n) => {
      let newLog = this.generateNewLog(goalId);
      n.manualLogs.push(newLog);
      return n;
    });
  }
  removeManualLog(logId: string) {
    this.update((n) => {
      n.manualLogs = n.manualLogs.filter((x) => x.id != logId);
      return n;
    });
  }
  updateManualLog(log: IManualSessionLogForm) {
    this.update((n) => {
      let index = n.manualLogs.findIndex((x) => x.id == log.id);
      n.manualLogs[index] = log;
      return n;
    });
  }
  async saveManualLogs() {
    let n = this.get();
    logger.log({ context: "saving manual logs", n });
    //TODO: Add validation and set error message in store
    let sessionEntries: IPointSession[] = [];
    let logEntries: IPointLog[] = [];
    n.manualLogs.forEach((entry) => {
      const duration = entry.duration;
      let start = attachTimeToDate(entry.startDate, entry.startTime);
      let end = attachTimeToDate(entry.endDate, entry.endTime);
      const id = generateSessionId(start.getTime());
      const log: IPointLog = {
        start: start.toISOString(),
        end: end.toISOString(),
        id: prefixTable(id, Resource.PointLog),
        sessionId: prefixTable(id, Resource.PointSession),
        totalFocus: duration,
        totalBreak: 0,
        goalId: entry.goalId,
        manualEntryId: entry.id,
        tzOffset: get(userPreferences).timeZoneOffset,
        targets: get(pointronPreferences).horizonTargets
      };
      const session: IPointSession = {
        start: start.toISOString(),
        end: end.toISOString(),
        elapsed: duration,
        id: prefixTable(id, Resource.PointSession),
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
      Resource.PointLog,
      { sessionEntries, logEntries },
      {
        action: PersistanceActionType.CUSTOM_QUERY,
        query:
          "fn::pointron::focus::saveManualLogs($sessionEntries, $logEntries);"
      }
    );
    this.reset();
    toasts.success("Manual log added successfully");
    appEvents.publish(PointronEvent.REFRESH_QUICK_FOCUS, true);
    appEvents.publish(PointronEvent.REFRESH_LOGS, true);
  }
  async deleteLog(id: string) {
    return dataManager.performMutation(
      Resource.PointLog,
      { id },
      {
        action: PersistanceActionType.CUSTOM_QUERY,
        query: "return fn::pointron::log::delete($id);"
      }
    );
  }
  /**
   * Saves focus logs to the database. This function is called when user finishes a focus session delegated from focus store.
   * @param focusStore
   * @param focusItemStore
   * @param isClose
   */
  finishFocus(
    focusStore: ISessionStore,
    focusItemStore: IFocusItemsStore,
    isClose: boolean
  ) {
    const m: IPointSession = {
      elapsed: focusStore.totalElapsed,
      extended: focusStore.totalExtended,
      start: focusStore.start?.toISOString() ?? "",
      end: new Date(
        (focusStore.start?.getTime() ?? 0) + focusStore.totalElapsed * 1000
      ).toISOString(),

      id: prefixTable(
        focusStore.currentSessionId ?? generateSessionId(new Date().getTime()),
        Resource.PointSession
      ),
      plannedEnd:
        focusStore.end?.toISOString() ?? focusStore.type != SessionType.COUNTUP
          ? new Date(
              new Date().getTime() + focusStore.plannedDuration * 1000
            ).toISOString()
          : "",
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
    const logs: IPointLog[] = focusStore.logs.map((l: FocusLog) => {
      let taskName = focusItemStore.items.find(
        (x) => x.taskId == l.taskId
      )?.label;
      if (!l.goalId) {
        l.goalId = "PointGoal:NonGoal";
      }
      return {
        ...l,
        id: prefixTable(l.start, Resource.PointLog),
        start: new Date(l.start).toISOString(),
        end: new Date(l.end!).toISOString(),
        sessionId: m.id,
        taskName,
        tzOffset: get(userPreferences).timeZoneOffset,
        targets: get(pointronPreferences).horizonTargets
      };
    });
    dataManager.performMutation(
      Resource.PointLog,
      {
        sessionData: m,
        logs,
        snapshot: {
          ...focusStore,
          id: prefixTable(Resource.pointSessionSnapshot, Resource.kv)
        },
        isClose
      },
      {
        action: PersistanceActionType.CUSTOM_QUERY,
        query:
          "fn::pointron::focus::finish::v4($sessionData, $logs, $snapshot, $isClose);"
      }
    );
  }
}

export const pointLogStore = new PointLogStore();

const seedLogsPaneStore: ILogsPaneStore = {
  logs: [],
  summary: { focus: 0, break: 0 },
  date: new Date()
};

class LogsPaneStore extends ObservableStore<ILogsPaneStore> {
  constructor() {
    super(Resource.logsPane);
    this.set(seedLogsPaneStore);
  }
  /**
   * Generates a summary of the logs
   * @param logs LogThumbnail[]
   * @returns DaySummary
   */
  generateSummary(logs: LogThumbnail[]): DaySummary {
    let focus = 0;
    let breakTime = 0;
    logs.forEach((x) => {
      focus += x.totalFocus;
      breakTime += x.totalBreak;
    });
    return { focus, break: breakTime };
  }
  // reset() {
  //   this.update((n) => {
  //     n.date = new Date();
  //     return n;
  //   });
  // }
  loader(data: any) {
    const n = this.get();
    let logs = [];
    if (data && data.length > 0) {
      logs = data.map((x: any) => {
        const { totalFocus, totalBreak } = sessionTotals(x);
        return { ...x, totalFocus, totalBreak };
      });
    } else {
      logs = [];
    }
    n.summary = this.generateSummary(logs);
    this.set({ ...n, logs });
  }
  resolveRefreshQuery() {
    const n = this.get();
    if (n.isPageRefreshing && !isSameDay(n.date, new Date())) {
      this.update((n) => {
        n.date = new Date();
        n.logs = [];
        n.isRefreshing = true;
        return n;
      });
    }
    return replaceParams("return fn::pointron::logs::fetch::v3($date);", {
      date: n.date.toISOString()
    });
  }
  refreshForDate(date: Date) {
    const n = this.get();
    if ((isSameDay(date, n.date) && n.logs.length > 0) || n.isPageRefreshing)
      return n;
    n.date = new Date(date);
    this.set(n);
    return dataManager.refresh(Resource.logsPane, true);
  }
}

export const logsPaneStore = new LogsPaneStore();
