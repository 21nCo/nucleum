import {
  attachTimeToDate,
  formatTime,
  isSameDay
} from "$lib/client/utils/time.utils";
import { currentTime } from "$lib/client/stores/app.store";
import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { get } from "svelte/store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { dataManager } from "$lib/client/persistence/dataManager";
import { appEvents, toasts } from "$lib/client/stores/notification.store";
import {
  SessionType,
  type DaySummary,
  type ISessionThumb,
  type ILogsPaneStore,
  type IManualSessionLogForm,
  type ISessionLog,
  type ISessionLogStore,
  type ISession
} from "./log.type";
import { resolveSessionTimeSplit } from "$lib/client/products/pointron/pointron.utils";
import { replaceParams } from "$lib/shared/utils/surreal.utils";
import { NodeType } from "$lib/client/products/memotron/node/node.type";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import { ObservableStore } from "$lib/client/stores/client.store";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { sessionStore } from "../focus/session.store";
import { BlockType } from "$lib/client/types/pointron/session.type";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";

class SessionLogStore extends ResourceStore<ISessionLog> {
  constructor() {
    super(Resource.sessionLog);
  }
}

export const sessionLogStore = new SessionLogStore();

class ManualLogStore extends ObservableStore<ISessionLogStore> {
  constructor() {
    super("manualLogStore");
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
      id: generateSimpleRandomId(),
      goalId: goalId ?? "",
      duration: 0
    };
    return newLog;
  }

  addNew(goalId?: string) {
    this.update((n) => {
      let newLog = this.generateNewLog(goalId);
      n.manualLogs.push(newLog);
      return n;
    });
  }

  remove(logId: string) {
    this.update((n) => {
      n.manualLogs = n.manualLogs.filter((x) => x.id != logId);
      return n;
    });
  }

  updateLog(log: IManualSessionLogForm) {
    this.update((n) => {
      let index = n.manualLogs.findIndex((x) => x.id == log.id);
      n.manualLogs[index] = log;
      return n;
    });
  }

  async save() {
    let n = this.get();
    let sessionEntries: OmitForCaptureWithId<ISession>[] = [];
    let logEntries: OmitForCaptureWithId<ISessionLog>[] = [];
    n.manualLogs.forEach((entry) => {
      const duration = entry.duration;
      let start = attachTimeToDate(entry.startDate, entry.startTime);
      let end = attachTimeToDate(entry.endDate, entry.endTime);
      const sessionId = generateResourceId(Resource.session);
      const log: OmitForCaptureWithId<ISessionLog> = {
        start: start.toISOString(),
        end: end.toISOString(),
        id: generateResourceId(Resource.sessionLog),
        sessionId: sessionId,
        focus: duration,
        breakTime: 0,
        goalId: entry.goalId,
        manualEntryId: entry.id
        // tzOffset: get(userPreferences).timeZoneOffset,
        // targets: get(pointronPreferences).horizonTargets
      };

      const session: OmitForCaptureWithId<ISession> = {
        start: start.toISOString(),
        end: end.toISOString(),
        elapsed: duration,
        id: sessionId,
        manualEntryId: entry.id,
        // logs: [{ ...log, start: start.getTime(), end: end.getTime() }],
        blocks: [
          {
            start: start.getTime(),
            type: BlockType.FOCUS,
            duration: duration,
            progress: 1,
            id: generateSimpleRandomId()
          },
          {
            id: generateSimpleRandomId(),
            start: end.getTime(),
            type: BlockType.NONE,
            progress: 0,
            duration: 0
          }
        ],
        items: [
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
        notes: entry.notes ?? {
          blocks: []
        },
        type: SessionType.MANUAL_ENTRY,
        extended: 0
      };
      sessionEntries.push(session);
      logEntries.push(log);
    });
    sessionLogStore.create(logEntries);
    sessionStore.create(sessionEntries);
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
  generateSummary(logs: ISessionThumb[]): DaySummary {
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

/**
 * @deprecated - use sessionStore instead
 */
export const logsPaneStore = new LogsPaneStore();
