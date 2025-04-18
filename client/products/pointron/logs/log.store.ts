import { attachTimeToDate, formatTime } from "$lib/client/utils/time.utils";
import { currentTime } from "$lib/client/stores/app.store";
import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { get } from "svelte/store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { toasts } from "$lib/client/stores/notification.store";
import {
  SessionType,
  type IManualSessionLogForm,
  type ISessionLog,
  type ISessionLogStore,
  type ISession
} from "./log.type";
import { ObservableStore } from "$lib/client/stores/client.store";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { sessionStore } from "../focus/session.store";
import { BlockType } from "$lib/client/types/pointron/session.type";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import type {
  IResourceSelectParams,
  IResourceSelectAdditionalParams
} from "$lib/client/types/data.type";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";

class SessionLogStore extends ResourceStore<ISessionLog> {
  constructor() {
    super(Resource.sessionLog);
  }

  selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    const expandedProps = [
      "*",
      "goalId.* as goal",
      // "(select * from $parent.goalId.parent) as topLevelGoal",
      "sessionId.* as session"
    ];

    const properties = [
      ...(additionalParams?.isExpand ? expandedProps : []),
      ...(params?.properties ?? [])
    ];
    params = {
      ...(params ?? {}),
      properties
    };
    return super.selectMany(params, additionalParams);
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
        startUnix: resolveUnixTimestamp(start),
        endUnix: resolveUnixTimestamp(end),
        id: generateResourceId(Resource.sessionLog),
        sessionId: sessionId,
        focus: duration,
        breakTime: 0,
        goalId: entry.goalId,
        manualEntryId: entry.id
      };

      const session: OmitForCaptureWithId<ISession> = {
        startUnix: resolveUnixTimestamp(start),
        endUnix: resolveUnixTimestamp(end),
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
    await sessionLogStore.create(logEntries, {
      context: PointronAction.MANUAL_FOCUS_ENTRY
    });
    await sessionStore.create(sessionEntries, {
      context: PointronAction.MANUAL_FOCUS_ENTRY
    });
    sessionStore.addToRecentFocusItems(logEntries);
    this.reset();
    toasts.success("Manual log added successfully");
    return true;
  }
}

export const manualLogStore = new ManualLogStore();
