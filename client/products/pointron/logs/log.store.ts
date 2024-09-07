import {
  attachTimeToDate,
  formatTime,
  isSameDay,
  toLocalISOString
} from "$lib/client/utils/time.utils";
import { currentTime, userPreferences } from "$lib/client/stores/app.store";
import { get, writable } from "svelte/store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { CacheStrategy, StoreDataType } from "$lib/client/types/data.type";
import { generateSessionId, generateUID } from "$lib/client/utils/utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { generateResourceId, prefixTable } from "$lib/shared/utils/text.utils";
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
import { resolveSessionTimeSplit } from "$lib/client/products/pointron/pointron.utils";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { NodeType } from "$lib/client/products/memotron/node/node.type";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import { ObservableStore } from "$lib/client/stores/client.store";
import { ResourceStore } from "$lib/client/components/resourceStores/resource.store";
import { pointSessionStore } from "../focus/session.store";
import { BlockType } from "$lib/client/types/pointron/session.type";

class PointLogStore extends ResourceStore<IPointLog> {
  constructor() {
    super(Resource.PointLog, {
      cacheStrategy: CacheStrategy.NO_CACHE
    });
  }
}

export const pointLogStore = new PointLogStore();

class ManualLogStore extends ObservableStore<IPointLogStore> {
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
      endTime: formatTime(userGlobalPreferences, get(currentTime), {
        format: "24"
      })!,
      startTime: formatTime(userGlobalPreferences, get(currentTime), {
        format: "24"
      })!,
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
    let sessionEntries: Partial<IPointSession>[] = [];
    let logEntries: Partial<IPointLog>[] = [];
    n.manualLogs.forEach((entry) => {
      const duration = entry.duration;
      let start = attachTimeToDate(entry.startDate, entry.startTime);
      let end = attachTimeToDate(entry.endDate, entry.endTime);
      const id = generateSessionId(start.getTime());
      const log: Partial<IPointLog> = {
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
      const session: Partial<IPointSession> = {
        start: start.toISOString(),
        end: end.toISOString(),
        elapsed: duration,
        id: prefixTable(id, Resource.PointSession),
        manualEntryId: entry.id,
        logs: [{ ...log, start: start.getTime(), end: end.getTime() }],
        blocks: [
          {
            start: start.getTime(),
            type: BlockType.FOCUS,
            duration: duration,
            progress: 1,
            id
          },
          {
            id: generateUID(),
            start: end.getTime(),
            type: BlockType.NONE,
            progress: 0,
            duration: 0
          }
        ],
        focusItems: {
          goals: [
            {
              id: entry.goalId,
              blocks: [
                {
                  start: start.getTime(),
                  end: end.getTime()
                }
              ]
            }
          ],
          tasks: []
        },
        notes: entry.notes ?? {
          blocks: []
        },
        type: SessionType.MANUAL_ENTRY,
        extended: 0
      };
      sessionEntries.push(session);
      logEntries.push(log);
    });
    pointLogStore.create(logEntries, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-saveManualLogs`
      }
    });
    pointSessionStore.create(sessionEntries, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-saveManualLogs`
      }
    });
    this.reset();
    toasts.success("Manual log added successfully");
    appEvents.publish(PointronEvent.REFRESH_QUICK_FOCUS, true);
    appEvents.publish(PointronEvent.REFRESH_LOGS, true);
    return true;
  }
}

export const manualLogStore = new ManualLogStore();

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
        let sessionTime = resolveSessionTimeSplit(x);
        return {
          ...x,
          totalFocus: sessionTime.focus,
          totalBreak: sessionTime.brek
        };
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
    return replaceParams(
      "select * from PointSession where id != PointSession:session and time::group(fn::user::time::date::v4(start), 'day') is time::group($date, 'day');",
      {
        date: n.date.toISOString()
      }
    );
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
