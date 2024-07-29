import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  type IActiveSessionStore,
  type ISessionInterval,
  BlockType,
  type IFocusGoal,
  type IFocusItemsStore,
  type ICurrentTask
} from "$lib/client/types/pointron/session.type";
import {
  generateSessionId,
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import {
  generateIntervalsFromComposition,
  getTotalsFromComposition
} from "$lib/client/products/pointron/pointron.utils";
import { get, writable } from "svelte/store";
import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
import {
  SessionCompositionType,
  type SessionComposition,
  BreakCompositionType
} from "$lib/client/types/pointron/sessionComposition.type";
import { appStore, userPreferences } from "$lib/client/stores/app.store";
import modalEvent from "$lib/client/components/modal/modal.store";
import {
  toasts,
  scheduledNotifications,
  fullPageLoadingScreen,
  appEvents
} from "$lib/client/stores/notification.store";
import { deepCopy, isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { AlertType } from "$lib/client/types/notification.type";
import { generateResourceId, prefixTable } from "$lib/shared/utils/text.utils";
import { CacheStrategy, DependencySyncType } from "$lib/client/types/data.type";
import { logger } from "$lib/client/stores/log.store";
import {
  type IPointLog,
  type IPointSession,
  SessionType
} from "$lib/client/products/pointron/logs/log.type";
import { pointLogStore } from "$lib/client/products/pointron/logs/log.store";
import { NodeType } from "$lib/client/products/memotron/node/node.type";
import context from "$lib/client/stores/context.store";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { determineResourceType } from "$lib/client/components/resourceStores/resource.utils";
import { goalStore } from "../goals/goal.store";
import { ResourceStore } from "$lib/client/components/resourceStores/resource.store";
import { resolveTaskFocus, resolveTotalTaskTime } from "./session.utils";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";

/** @deprecated */
export const todayFocusStore = initTodayFocus();

function initTodayFocus() {
  const { subscribe, set, update } = writable<{
    focus: number;
    streak: number;
  }>();
  return {
    subscribe,
    set,
    incrementTodayFocus: (x: number) => {
      update((n: { focus: number; streak: number }) => {
        n.focus += x;
        return n;
      });
    }
  };
}

export const newPresetLabel = writable<string>("");

const seedSessionStore: IActiveSessionStore = {
  currentSessionId: undefined,
  isQuickStartOn: false,
  type: SessionType.COUNTUP,
  state: SessionState.NOT_STARTED,
  timeElapsed: 0,
  totalElapsed: 0,
  totalIdle: 0,
  sessionProgress: 0,
  totalExtended: 0,
  plannedDuration: 0,
  notes: {
    blocks: [
      {
        id: generateUID(),
        contentType: NodeType.SIMPLE_TEXT,
        body: ""
      }
    ]
  },
  intervals: [
    {
      id: generateUID(),
      duration: 0.0001,
      progress: 1,
      type: BlockType.FOCUS
    }
  ],
  currentIdle: 0,
  isSessionRunning: false,
  currentBlockId: "",
  composition: {
    totalDuration: 60 * 60,
    focusDuration: 60 * 60,
    breakDuration: 0,
    breakReminder: 0,
    numberOfBreaks: 1,
    type: SessionCompositionType.COUNTUP,
    id: "slider",
    breakType: BreakCompositionType.REMINDER
  }
};

class ActiveSessionStore extends KeyValueStore<IActiveSessionStore> {
  timer: any;
  idleTimer: any;
  isIntervalTimeLimitNotified: boolean = false;
  constructor() {
    super(
      Resource.pointSessionSnapshotv2,
      { ...seedSessionStore },
      {
        refreshOnAppear: true,
        isPreventAutoPersist: true
      }
    );
  }
  propagateMessageToParent(n: IActiveSessionStore) {
    // try {
    //   const todayFocus = get(todayFocusStore)?.focus;
    //   const isFocusing = n.currentBlock.type == BlockType.FOCUS;
    //   const appearanceConfig = get(appearance);
    //   const colors = retrieveCurrentColors(appearanceConfig);
    //   const widgetSnapshot = {
    //     goalName: n.currentLog?.taskName,
    //     color:
    //       isFocusing && n.currentLog.color
    //         ? customColor(appearanceConfig, n.currentLog.color)
    //         : isFocusing
    //           ? colors.aps1
    //           : colors.ass1,
    //     start:
    //       n.currentBlock.type == BlockType.FOCUS
    //         ? n.start?.toISOString()
    //         : new Date(n.currentBlock.start)?.toISOString(),
    //     end: n.end?.toISOString(),
    //     isSessionRunning: n.isSessionRunning,
    //     isFocusing,
    //     todayFocus
    //   };
    //   postToParent({
    //     session: JSON.stringify(widgetSnapshot)
    //   });
    //   setTimeout(() => {
    //     const notifications = get(scheduledNotifications);
    //     postToParent({
    //       notifications
    //     });
    //   }, 2000);
    //   return widgetSnapshot;
    // } catch (error) {
    //   logger.logError(error);
    // }
  }
  private clearTimers() {
    clearInterval(this.timer);
    clearInterval(this.idleTimer);
  }
  shallowReset() {
    this.clearTimers();
    appStore.hideFullScreenPlayer(true);
    scheduledNotifications.reset();
  }
  /**
   * Completely resets the session store
   * @returns brand new session store with seed values
   */
  reset() {
    logger.log("session store reset");
    this.shallowReset();
    modalEvent.hideSpecific(PointronEvent.SESSION_FINISHED);
    modalEvent.hideSpecific(PointronEvent.BREAK_REMINDER);
    let newSession: IActiveSessionStore = deepCopy(seedSessionStore);
    newSession.composition.breakReminder =
      get(pointronPreferences)?.breakReminder;
    return newSession;
  }
  refreshNotifications(n: IActiveSessionStore) {
    scheduledNotifications.set([]);
    let sessionTimeRemaining: number | undefined = undefined;
    if (n.type != SessionType.COUNTUP) {
      sessionTimeRemaining = n.plannedDuration - n.totalElapsed;
      if (sessionTimeRemaining < 0) this.clearTimers();
      // if (n.type == SessionType.COUNTDOWN && sessionTimeRemaining < 0) {
      //   n.state = SessionState.TIME_IS_UP;
      //   appEvents.publish(PointronEventEnum.SESSION_TIME_IS_UP);
      // } else if (
      //   n.type == SessionType.COUNTDOWN &&
      //   sessionTimeRemaining < get(pointronConstants).runningOutDuration &&
      //   (n.state == SessionState.FOCUS_RUNNING ||
      //     n.state == SessionState.TIME_IS_UP)
      // ) {
      //   n.state = SessionState.TIME_IS_RUNNING_OUT;
      // }
      scheduledNotifications.push({
        inSeconds: sessionTimeRemaining,
        message: "Session time is up. Please extend or finish the session",
        timestamp: new Date().getTime() + sessionTimeRemaining * 1000,
        title: "Focus session time is up",
        sound: "dingding.mp3",
        id: "timeIsUp"
      });
    }
    let breakReminderSetting = undefined;
    let timeRemainingToTakeBreak: number | undefined = undefined;
    const currentBlockIndex = n.intervals.findIndex(
      (x) => x.id == n.currentBlockId
    );
    if (
      n.type != SessionType.PREDEFINED_INTERVALS &&
      n.state === SessionState.FOCUS_RUNNING
    ) {
      breakReminderSetting =
        n.composition.breakType === BreakCompositionType.REMINDER
          ? n.composition?.breakReminder ??
            get(pointronPreferences)?.breakReminder
          : undefined;
      if (!breakReminderSetting) return;
      timeRemainingToTakeBreak = breakReminderSetting - n.timeElapsed;
      if (timeRemainingToTakeBreak < 0 && !this.isIntervalTimeLimitNotified) {
        appEvents.publish(PointronEvent.BREAK_REMINDER);
        this.isIntervalTimeLimitNotified = true;
      }
    } else if (
      n.type === SessionType.PREDEFINED_INTERVALS &&
      n.state === SessionState.FOCUS_RUNNING
    ) {
      let currentBlock = n.intervals[currentBlockIndex];
      if (currentBlock?.duration) {
        timeRemainingToTakeBreak = currentBlock.duration - n.timeElapsed;
        if (timeRemainingToTakeBreak < 0 && !this.isIntervalTimeLimitNotified) {
          appEvents.publish(PointronEvent.PREDEFINED_INTERVAL_NOTIFIER);
          this.isIntervalTimeLimitNotified = true;
        }
      }
    } else if (
      n.type === SessionType.PREDEFINED_INTERVALS &&
      n.state === SessionState.BREAK_RUNNING
    ) {
      let currentBlock = n.intervals[currentBlockIndex];
      if (currentBlock?.duration) {
        let timeRemainingToRefocus = currentBlock.duration - n.timeElapsed;
        if (timeRemainingToRefocus < 0) {
          appEvents.publish(PointronEvent.PREDEFINED_INTERVAL_NOTIFIER);
        }
      }
    }
    /**
     * TODO - remind if no break taken - for multiples of the reminder...
     */
    if (
      (n.type === SessionType.COUNTUP && timeRemainingToTakeBreak) ||
      (n.type != SessionType.COUNTUP &&
        sessionTimeRemaining &&
        timeRemainingToTakeBreak &&
        sessionTimeRemaining > timeRemainingToTakeBreak)
    ) {
      if (!breakReminderSetting) return;
      scheduledNotifications.push({
        inSeconds: timeRemainingToTakeBreak,
        message:
          "Its been " +
          breakReminderSetting / 60 +
          " minute(s) since you took a break. Please consider taking a break.",
        timestamp: new Date().getTime() + timeRemainingToTakeBreak * 1000,
        title: "Break Reminder",
        sound: "ping.wav",
        id: "breakReminder"
      });
      return timeRemainingToTakeBreak;
      // scheduledNotifications.push({
      //   inSeconds: timeRemainingToTakeBreak * 2,
      //   message:
      //     "Its been " +
      //     2 * (breakReminder / 60) +
      //     " minute(s) since you took a break. Please consider taking a break.",
      //   timestamp: new Date().getTime() + 2 * timeRemainingToTakeBreak * 1000,
      //   title: "Break Reminder",
      //   sound: "ping.wav",
      //   id: "breakReminderTwo",
      // });
    }
  }
  /**
   * Resume the session timer and sets everything related to timer including notifications, progress on interval bars, etc.
   * @param n current session store
   * @param options resume options - whether to persist or reset timer
   * @returns updated session store
   */
  private _resumeTimer(
    options: { isResetTimer?: boolean } = {
      isResetTimer: true
    }
  ) {
    let session = this.get();
    //TODO - check if this is needed
    if (options.isResetTimer) {
      this.modify({ timeElapsed: 0 });
    }
    this.clearTimers();
    if (session.type === SessionType.PREDEFINED_INTERVALS) {
      this._restorePredefinedSessionState(session);
    }
    this.timer = setInterval(() => {
      session = this.get();
      const currentTime = new Date().getTime();
      const totalElapsed =
        (currentTime - session.start!.getTime()) / 1000 - session.totalIdle;
      const currentBlock = session.intervals.find(
        (x) => x.id == session.currentBlockId
      );
      const timeElapsed = (currentTime - currentBlock?.start!) / 1000;
      const timeRemainingToTakeBreak = this.refreshNotifications(session);
      const sessionProgress = this.refreshSessionProgress(session) ?? 0;
      // console.log({
      //   totalElapsed,
      //   timeElapsed,
      //   currentBlock,
      //   sessionProgress,
      //   session
      // });
      let plannedDuration = session.plannedDuration;
      let end = session.end;
      if (
        session.type === SessionType.COUNTDOWN &&
        session.composition?.type == SessionCompositionType.TARGET_FOCUS &&
        currentBlock?.type === BlockType.BREAK
      ) {
        const currentBlockIndex = session.intervals.findIndex(
          (x) => x.id == session.currentBlockId
        );
        session.intervals[currentBlockIndex] = {
          ...session.intervals[currentBlockIndex],
          duration: (currentTime - currentBlock?.start!) / 1000
        };
        plannedDuration = getTotalsFromComposition({
          intervals: session.intervals
        })?.duration;
        end = this.resolveEndTime({
          start: session.start!,
          composition: session.composition,
          plannedDuration
        });
      }
      const { intervals, isContinueSession } = this._refreshIntervalsProgress(
        session,
        {
          timeElapsed,
          totalElapsed
        }
      );
      this.modify(
        {
          totalElapsed,
          timeElapsed,
          timeRemainingToTakeBreak,
          sessionProgress,
          plannedDuration,
          intervals,
          end
        },
        { isPreventCachingDefault: true }
      );
      if (isContinueSession) this._continueSession();
    }, 1000);
  }
  private _restorePredefinedSessionState(session: IActiveSessionStore) {
    let currentInterval: ISessionInterval | undefined = undefined;
    const now = new Date().getTime();
    session.intervals.forEach((interval, index) => {
      if (interval.start < now && session.intervals[index + 1]?.start > now) {
        currentInterval = interval;
        return;
      }
    });
    if (!currentInterval) return;
    currentInterval = currentInterval as ISessionInterval;
    this.modify(
      {
        currentBlockId: currentInterval.id,
        state:
          currentInterval.type === BlockType.FOCUS
            ? SessionState.FOCUS_RUNNING
            : SessionState.BREAK_RUNNING
      },
      { isPersist: false }
    );
  }
  private async _continueSession() {
    let session = this.get();
    const currentBlockIndex = session.intervals.findIndex(
      (x) => x.id == session.currentBlockId
    );
    const nextBlockId = session.intervals[currentBlockIndex + 1]?.id;
    let state;
    if (session.state == SessionState.FOCUS_RUNNING) {
      appEvents.publish(PointronEvent.INTERVAL_ENDED);
      state = SessionState.BREAK_RUNNING;
    } else {
      appEvents.publish(PointronEvent.BREAK_ENDED);
      state = SessionState.FOCUS_RUNNING;
      this.isIntervalTimeLimitNotified = false;
    }
    this.modify(
      {
        state,
        currentBlockId: nextBlockId
      },
      { isPersist: false }
    );
    this._resumeTimer();
    await this.persist();
  }
  /**
   * Calculates blocks and total duration of the session based on composition seelction.
   * @param n sessionStore
   * @returns blocks - updated sessionStore
   */
  onComposeComplete(isPersist: boolean = true) {
    const session = this.get();
    const composition = session.composition;
    if (!composition) return;
    let intervals: ISessionInterval[] = [];
    let sessionType = session.type;
    let plannedDuration = session.plannedDuration;
    if (composition && composition.type === SessionCompositionType.COUNTUP) {
      countup();
    } else if (
      composition &&
      composition.type != SessionCompositionType.SLIDER
    ) {
      if (
        (composition?.numberOfFocusRounds &&
          composition.numberOfFocusRounds > 100) ||
        (composition?.numberOfBreaks && composition.numberOfBreaks > 100)
      ) {
        toasts.trigger({
          message:
            "Too many rounds selected: " + composition.numberOfFocusRounds,
          type: AlertType.ERROR,
          id: generateUID(),
          callback: () => {
            composition.numberOfFocusRounds = 1;
            composition.numberOfBreaks = 1;
          }
        });
        return;
      }
      intervals = generateIntervalsFromComposition(composition);
      if (intervals.length > 1) sessionType = SessionType.PREDEFINED_INTERVALS;
      else if (intervals.length === 1) sessionType = SessionType.COUNTDOWN;
      plannedDuration = getTotalsFromComposition({
        intervals: intervals
      })?.duration;
    } else if (
      session.type === SessionType.COUNTDOWN &&
      session.plannedDuration
    ) {
      intervals = [
        {
          id: generateUID(),
          start: new Date().getTime(),
          duration: session.plannedDuration,
          progress: 0,
          type: BlockType.FOCUS
        }
      ];
    } else if (session.type === SessionType.COUNTUP) {
      countup();
    }
    if (!isValidArrayWithData(intervals)) {
      countup();
    }
    console.log({
      context: "composeSession",
      blocks: intervals,
      sessionType,
      plannedDuration,
      currentBlockId: intervals[0].id
    });
    this.modify(
      {
        intervals: intervals,
        type: sessionType,
        plannedDuration,
        end: this.resolveEndTime({
          start: new Date(),
          composition,
          plannedDuration,
          end: session.end
        }),
        currentBlockId: intervals[0].id
      },
      { isPersist }
    );
    function countup() {
      intervals = [
        {
          id: generateUID(),
          start: new Date().getTime(),
          duration: 0.0001,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
      sessionType = SessionType.COUNTUP;
    }
  }
  /**
   * @deprecated
   * updates start and end time of current and previous blocks.
   * @param n sessionStore
   * @param type currentBlock type whether focus or break
   * @returns updated sessionStore
   */
  updateBlocks(type: BlockType) {
    console.log("updateBlocks - session store");
    let session = this.get();
    const currentBlockIndex = session.intervals.findIndex(
      (x) => x.id == session.currentBlockId
    );
    if (session.type === SessionType.PREDEFINED_INTERVALS) {
      let previousBlock = session.intervals[currentBlockIndex - 1];
      if (previousBlock) {
        previousBlock.end = new Date().getTime();
        session.intervals[currentBlockIndex - 1] = previousBlock;
      }
    } else {
      let currentBlock = session.intervals?.pop();
      let previousBlock = session.intervals?.pop();
      if (previousBlock && currentBlock) {
        previousBlock.end = new Date().getTime();
        session.intervals = [
          ...(session.intervals ?? []),
          previousBlock,
          currentBlock
        ];
      } else if (currentBlock) {
        currentBlock.end = new Date().getTime();
        session.intervals = [...(session.intervals ?? []), currentBlock];
      }
    }
    session.isSessionRunning = true;
    if (type == BlockType.FOCUS) {
      session.state = SessionState.FOCUS_RUNNING;
    } else if (type == BlockType.BREAK) {
      session.state = SessionState.BREAK_RUNNING;
    }
    this.modify(session, { isPersist: false });
  }
  resolveEndTime(n: {
    start: Date;
    composition: SessionComposition;
    plannedDuration: number;
    end?: Date;
  }) {
    if (!n.start) return;
    if (n.composition?.type == SessionCompositionType.END_TIME_FIXED) {
      return n.end;
    } else if (n.composition?.type == SessionCompositionType.TARGET_FOCUS) {
      //todo
    } else {
      return new Date(n.start.getTime() + n.plannedDuration * 1000);
    }
  }
  refreshSessionProgress(n: IActiveSessionStore) {
    if (n.type == SessionType.COUNTUP) return 100;
    if (!n.start || !n.end) return;
    return (
      (n.totalElapsed / ((n.end?.getTime() - n.start?.getTime()) / 1000)) * 100
    );
  }
  private _refreshIntervalsProgress(
    session: IActiveSessionStore,
    params: { timeElapsed: number; totalElapsed: number }
  ): {
    intervals: ISessionInterval[];
    isContinueSession: boolean;
  } {
    let isContinueSession = false;
    if (session.type == SessionType.COUNTUP) {
      if (session.intervals && session.intervals.length < 1)
        return { intervals: session.intervals, isContinueSession };
      const currentLastBar = session.intervals.pop();
      if (!currentLastBar)
        return { intervals: session.intervals, isContinueSession };
      let lastBar = {
        ...currentLastBar,
        duration: currentLastBar.start
          ? (new Date().getTime() - currentLastBar.start) / 1000
          : currentLastBar.duration ?? 0 + params.timeElapsed
      };
      return { intervals: [...session.intervals, lastBar], isContinueSession };
    }
    let totalElapsedRemaining = +params.totalElapsed.toFixed(0);
    let newBars: Array<ISessionInterval> = [];
    session.intervals.forEach((bar) => {
      let barDuration = bar.duration ?? 0;
      let refreshedProgress = 0;
      if (barDuration == totalElapsedRemaining) {
        refreshedProgress = 1;
        totalElapsedRemaining = 0;
        const currentBlockIndex = session.intervals.findIndex(
          (x) => x.id == session.currentBlockId
        );
        if (currentBlockIndex === session.intervals.length - 1) {
          this.finishSession();
        } else {
          isContinueSession = true;
        }
      } else if (barDuration < totalElapsedRemaining) {
        refreshedProgress = 1;
        totalElapsedRemaining = totalElapsedRemaining - barDuration;
      } else {
        refreshedProgress =
          1 - (barDuration - totalElapsedRemaining) / barDuration;
        totalElapsedRemaining = 0;
      }
      newBars = [...newBars, { ...bar, progress: refreshedProgress }];
    });
    if (totalElapsedRemaining > 0) {
      this.finishSession();
    }
    return { intervals: newBars, isContinueSession };
  }
  /**
   * Resumes the session from break state to focus state.
   * @returns
   */
  private async _resumeSession() {
    let session = this.get();
    if (session.state === SessionState.FOCUS_RUNNING) return;
    let intervals: ISessionInterval[] = [];
    let newBlockId = generateUID();
    let currentBlockId = newBlockId;
    const currentBlockIndex = session.intervals.findIndex(
      (x) => x.id == session.currentBlockId
    );
    const currentBlock = session.intervals[currentBlockIndex];
    if (session.type == SessionType.COUNTUP) {
      intervals = [
        ...session.intervals,
        {
          id: newBlockId,
          start: new Date().getTime(),
          duration: 0,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
    } else if (session.state === SessionState.BREAK_RUNNING) {
      intervals = session.intervals.slice(0, currentBlockIndex);
      intervals = [
        ...intervals,
        {
          ...currentBlock,
          duration: session.timeElapsed,
          progress: 1,
          type: BlockType.BREAK
        }
      ];
      if (
        session.type === SessionType.COUNTDOWN &&
        session.composition?.type != SessionCompositionType.TARGET_FOCUS
      ) {
        intervals = [
          ...intervals,
          {
            id: newBlockId,
            start: new Date().getTime(),
            duration: currentBlock.duration - session.timeElapsed,
            progress: 0,
            type: BlockType.FOCUS
          }
        ];
      }
      intervals = intervals.concat(
        session.intervals.slice(currentBlockIndex + 1)
      );
      if (
        session.type === SessionType.COUNTDOWN &&
        session.composition?.type == SessionCompositionType.TARGET_FOCUS
      ) {
        currentBlockId = session.intervals[currentBlockIndex + 1]?.id;
        intervals[currentBlockIndex + 1].start = new Date().getTime();
      }
    }
    this.modify({
      intervals,
      currentBlockId,
      state: SessionState.FOCUS_RUNNING
    });
    this.isIntervalTimeLimitNotified = false;
    this._resumeTimer();
    return true;
  }
  private async _stopCurrentTaskOrGoal(
    props: { isPersist?: boolean } = {
      isPersist: false
    }
  ) {
    console.log("stopping current task or goal");
    let session = this.get();
    if (!session.currentTask) return;
    let end = new Date().getTime();
    await focusItemsStore.appendFocusBlock(session.currentTask.id, {
      start: session.currentTask.start,
      end
    });
    return this.modify(
      {
        currentTask: undefined,
        isQuickStartOn: false
      },
      {
        isPersist: props.isPersist,
        queueParams: props.isPersist
          ? {
              isUseQueueFirstApproach: true,
              mutationId: `${this.id}-update-${Date.now()}`
            }
          : undefined
      }
    );
  }

  async close() {
    logger.log({ context: "session store close" });
    focusItemsStore.reset(true);
    let session = this.reset();
    this.modify(session, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-close`
      }
    });
    // this.propagateMessageToParent(session);
    appEvents.publish(PointronEvent.SESSION_CLOSED);
    return session;
  }
  async loader(savedSessionStore: IActiveSessionStore) {
    logger.log({ context: "session store loader", savedSessionStore });
    savedSessionStore = { ...savedSessionStore };
    if (savedSessionStore.start && typeof savedSessionStore.start == "string") {
      savedSessionStore.start = new Date(savedSessionStore.start);
    }
    if (savedSessionStore.end && typeof savedSessionStore.end == "string") {
      savedSessionStore.end = new Date(savedSessionStore.end);
    }
    if (
      savedSessionStore.currentSessionId &&
      savedSessionStore.isSessionRunning
    ) {
      modalEvent.hideSpecific(PointronEvent.SESSION_FINISHED);
      appStore.showMiniPlayer(PointronAction.FOCUS_PLAYER);
      this.modify(savedSessionStore, { isPersist: false });
      this._resumeTimer({
        isResetTimer: false
      });
    } else if (savedSessionStore.state === SessionState.FINISHED) {
      this.shallowReset();
      appStore.runAction(PointronEvent.SESSION_FINISHED);
      this.modify(savedSessionStore, { isPersist: false });
    } else {
      savedSessionStore = this.reset();
      this.modify(savedSessionStore, { isPersist: false });
    }
    this.propagateMessageToParent(savedSessionStore);
  }
  loadEmptyState() {
    logger.log({ context: "session store loadEmptyState" });
    this.modify(this.reset(), { isPersist: false });
    this.propagateMessageToParent(this.get());
  }
  async finishSession(isClose: boolean = false) {
    let session = this.get();
    if (!session.isQuickStartOn)
      fullPageLoadingScreen.show("Finishing session...");
    try {
      const now = new Date().getTime();
      if (session.currentTask) await this._stopCurrentTaskOrGoal();
      // let lastBlock = n.intervals?.pop();
      // if (lastBlock) {
      //   lastBlock.end = now;
      //   n.intervals = [...(n.intervals ?? []), lastBlock];
      // }
      // n.blocks = [...n.blocks, { start: now, duration: 0, progress: 1 }];
      // session.state = SessionState.FINISHED;
      // session.isSessionRunning = false;
      pointSessionStore.finishFocus();
    } catch (err) {
      logger.logError(err);
    } finally {
      if (isClose) {
        this.close();
      } else {
        this.shallowReset();
        // this.propagateMessageToParent(session);
        this.modify(
          { isSessionRunning: false, state: SessionState.FINISHED },
          {
            queueParams: {
              isUseQueueFirstApproach: true,
              mutationId: `${this.id}-finish`
            }
          }
        );
        appEvents.publish(PointronEvent.SESSION_FINISHED);
      }
      fullPageLoadingScreen.hide();
    }
    return session;
  }
  async startTask(id: string) {
    // const newLog: FocusLog = {
    //   taskId: id,
    //   goalId,
    //   taskName,
    //   color,
    //   start: new Date().getTime(),
    //   blocks: [
    //     {
    //       start: new Date().getTime(),
    //       type: BlockType.FOCUS
    //     }
    //   ]
    // };
    let n = this.get();
    if (n.currentTask) await this._stopCurrentTaskOrGoal();
    this.modify(
      { currentTask: { start: new Date().getTime(), id } },
      { isPersist: n.state != SessionState.BREAK_RUNNING }
    );
    if (n.state === SessionState.BREAK_RUNNING) {
      await this._resumeSession();
    }
  }
  async startGoal(id: string) {
    let session = this.get();
    if (session.currentTask) await this._stopCurrentTaskOrGoal();
    // const currentLog = {
    //   goalId: id,
    //   taskName: goalName,
    //   taskId: "",
    //   color,
    //   start: new Date().getTime(),
    //   blocks: [
    //     {
    //       start: new Date().getTime(),
    //       type: BlockType.FOCUS
    //     }
    //   ]
    // };
    this.modify(
      { currentTask: { start: new Date().getTime(), id } },
      { isPersist: session.state != SessionState.BREAK_RUNNING }
    );
    if (session.state === SessionState.BREAK_RUNNING) {
      await this._resumeSession();
    }
  }
  async stopCurrentTaskOrGoal() {
    await this._stopCurrentTaskOrGoal({ isPersist: true });
  }
  resumeTimer(isResetTimer: boolean = true) {
    return this._resumeTimer({ isResetTimer });
  }
  async startBreak() {
    let session = this.get();
    if (session.state === SessionState.BREAK_RUNNING) return false;
    let intervals: ISessionInterval[] = [];
    let newBlockId = generateUID();
    if (session.type == SessionType.COUNTUP) {
      intervals = [
        ...session.intervals,
        {
          id: newBlockId,
          start: new Date().getTime(),
          duration: 0,
          progress: 1,
          type: BlockType.BREAK
        }
      ];
    } else if (
      session.type === SessionType.COUNTDOWN ||
      session.state === SessionState.FOCUS_RUNNING
    ) {
      intervals = resolveBlocksForCountdown();
    }

    this.modify({
      intervals,
      currentBlockId: newBlockId,
      state: SessionState.BREAK_RUNNING
    });
    this._resumeTimer();
    return true;

    function resolveBlocksForCountdown() {
      let blocks: ISessionInterval[] = [];
      const currentBlockIndex = session.intervals.findIndex(
        (x) => x.id == session.currentBlockId
      );
      const currentBlock = session.intervals[currentBlockIndex];
      blocks = session.intervals.slice(0, currentBlockIndex);
      blocks = [
        ...blocks,
        {
          ...currentBlock,
          duration: session.timeElapsed,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
      if (
        session.type == SessionType.COUNTDOWN &&
        session.composition?.type == SessionCompositionType.TARGET_FOCUS
      ) {
        blocks = [
          ...blocks,
          {
            id: newBlockId,
            start: new Date().getTime(),
            duration: 0,
            progress: 0,
            type: BlockType.BREAK
          },
          {
            id: generateUID(),
            duration: currentBlock.duration - session.timeElapsed,
            progress: 0,
            start: new Date().getTime(),
            type: BlockType.FOCUS
          }
        ];
      } else {
        blocks = [
          ...blocks,
          {
            id: newBlockId,
            start: new Date().getTime(),
            duration: currentBlock.duration - session.timeElapsed,
            progress: 0,
            type: BlockType.BREAK
          }
        ];
      }
      let remainingBars = session.intervals.slice(currentBlockIndex + 1);
      blocks = blocks.concat(remainingBars);
      return blocks;
    }
  }
  async resumeSession() {
    await this._resumeSession();
  }
  clearIntervals() {
    this.clearTimers();
  }
  async extendSession() {
    let extendDurationSetting = get(pointronPreferences).extendDuration * 60;
    let n = this.get();
    n.totalExtended = n.totalExtended + extendDurationSetting;
    n.plannedDuration = n.plannedDuration + extendDurationSetting;
    if (!n.plannedDuration) return n;
    n.end = this.resolveEndTime({ ...n });
    let currentLastBar = n.intervals.pop();
    if (currentLastBar) {
      let lastBar = {
        ...currentLastBar,
        duration: currentLastBar.duration + extendDurationSetting
      };
      n.intervals = [...n.intervals, lastBar];
    }
    this.modify(n, { isPersist: false });
    if (n.state === SessionState.TIME_IS_UP) {
      await this._resumeTimer({ isResetTimer: false });
    }
  }
  async startSession(isQuickStart: boolean = false) {
    this.onComposeComplete(false);
    //todo - if auto open enabled
    if (isQuickStart) appStore.showMiniPlayer(PointronAction.FOCUS_PLAYER);
    else appStore.showFullScreenPlayer(PointronAction.FULL_SCREEN_FOCUS);

    if (!get(context).isEmbed && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const sessionId = generateSessionId(new Date().getTime());
    this.isIntervalTimeLimitNotified = false;
    this.modify(
      {
        currentSessionId: sessionId,
        isSessionRunning: true,
        start: new Date(),
        state: SessionState.FOCUS_RUNNING
      },
      { isPersist: false }
    );
    this._resumeTimer();
    const mutationId = `${this.id}-startSession`;
    this.persist(undefined, { isUseQueueFirstApproach: true, mutationId });
  }
  /**
   * Starts a quick start session for a given goal.
   * @param goal
   */
  async quickStart(goal: string) {
    let n = this.reset();
    focusItemsStore.reset();
    try {
      let composition = {
        type: SessionCompositionType.COUNTUP,
        totalDuration: 0,
        focusDuration: 0,
        breakDuration: 0,
        numberOfBreaks: 0,
        breakReminder: get(pointronPreferences)?.breakReminder ?? 0,
        id: "slider",
        breakType: BreakCompositionType.REMINDER
      };
      this.modify(
        {
          ...n,
          composition,
          type: SessionType.COUNTUP,
          end: undefined,
          plannedDuration: 0,
          isQuickStartOn: true,
          currentTask: { start: new Date().getTime(), id: goal }
        },
        { isPersist: false }
      );
      await focusItemsStore.addGoal(goal);
      await this.startSession(true);
    } catch (err) {
      logger.logError(err);
    }
  }
  async onPresetSelection(preset: SessionComposition) {
    this.modify({ composition: preset }, { isPersist: false });
    this.onComposeComplete();
  }
  async resetComposition() {
    let composition = {
      id: generateUID(),
      type: SessionCompositionType.TOTAL_DURATION,
      focusDuration: 0,
      numberOfBreaks: 0,
      breakDuration: 5 * 60,
      totalDuration: 60 * 60,
      breakReminder: 60 * 60,
      breakType: BreakCompositionType.REMINDER
    };
    this.modify({ composition }, { isPersist: false });
    this.onComposeComplete();
  }
  async saveCurrentCompositionAsPreset() {
    let n = this.get();
    if (!n.composition) return;
    const name = get(newPresetLabel);
    return pointronPreferences.addPreset({
      ...n.composition,
      name,
      id: generateUID()
    });
  }
  /**
   * @deprecated - slider duration setting is deprecated
   * @param duration
   */
  async onSliderDurationChange(duration: number) {
    let n = this.get();
    if (duration === 0) {
      n.type = SessionType.COUNTUP;
      n.plannedDuration = 0;
    } else {
      n.plannedDuration = duration;
      n.type = SessionType.COUNTDOWN;
    }
    n.composition = {
      ...seedSessionStore.composition,
      type: SessionCompositionType.SLIDER,
      totalDuration: duration,
      focusDuration: duration
    };
    //TODO - debounced
    this.onComposeComplete();
  }
  async saveNotes() {
    this.persist({ notes: this.get().notes });
  }
  /**
   * Resolves the current goal for the current task.
   * @param currentTask
   * @returns
   */
  resolveCurrentGoal(currentTask: ICurrentTask | undefined = undefined) {
    if (!currentTask) currentTask = this.get().currentTask;
    if (!currentTask) return;
    const resourceType = determineResourceType(currentTask.id);
    let goalId;
    if (resourceType === Resource.PointGoal) goalId = currentTask.id;
    else
      goalId = focusItemsStore
        .get()
        .goals.find((x) => x.tasks?.includes(currentTask.id))?.id;
    if (!goalId) return;
    return goalStore.resolveGoal(goalId);
  }
  /**
   * Resolves the current goal for the current task.
   * @param currentTask
   * @returns
   */
  resolveCurrentTask(currentTask: ICurrentTask | undefined = undefined) {
    if (!currentTask) currentTask = this.get().currentTask;
    if (!currentTask) return;
    const resourceType = determineResourceType(currentTask.id);
    let goalId;
    if (resourceType === Resource.PointGoal) {
      goalId = currentTask.id;
      return goalStore.resolveGoal(goalId);
    }
    return focusItemsStore.get().tasks.find((x) => x.id == currentTask.id);
  }
}

export const sessionStore = new ActiveSessionStore();

export const lastActiveGoalIdForEditing = writable<string | undefined>(
  undefined
);

const seedFocusItemsStore: IFocusItemsStore = {
  goals: [],
  tasks: []
};

class FocusItemsStore extends KeyValueStore<IFocusItemsStore> {
  constructor() {
    super(
      Resource.pointSessionFocusItemsv2,
      { ...seedFocusItemsStore },
      {
        refreshOnAppear: true,
        dependencies: [
          { resource: Resource.PointGoal, syncType: DependencySyncType.EAGER }
        ]
      }
    );
  }
  reset(isPersist: boolean = false) {
    console.log({ context: "focus items store - reset" });
    this.modify(
      { goals: [], tasks: [] },
      {
        isPersist,
        queueParams: {
          isUseQueueFirstApproach: true,
          mutationId: `${this.id}-reset`
        }
      }
    );
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async addTask(label: string, goalId: string) {
    let n = this.get();
    let id = generateResourceId(Resource.task);
    this.modify(
      {
        goals: n.goals.map((x: IFocusGoal) => {
          if (x.id === goalId) x.tasks = [...(x.tasks ?? []), id];
          return x;
        }),
        tasks: [
          ...(n.tasks ?? []),
          {
            label,
            id
          }
        ]
      },
      {
        queueParams: {
          isUseQueueFirstApproach: true,
          mutationId: `${this.id}-addTask`
        }
      }
    );
    if (goalId) lastActiveGoalIdForEditing.set(goalId);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async addGoal(id: string) {
    let n = this.get();
    if (n.goals.some((x) => x.id === id)) return;
    n.goals.push({ id, tasks: [], blocks: [] });
    this.modify(n, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-addGoal`
      }
    });
    lastActiveGoalIdForEditing.set(id);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async updateTaskLabel(id: string, label: string) {
    let n = this.get();
    const tasks = n.tasks.map((t) => {
      if (t.id == id) {
        t.label = label;
        return t;
      }
      return t;
    });
    this.modify({ tasks }, { isDebouncedPersist: true });
  }
  async appendFocusBlock(id: string, block: { start: number; end: number }) {
    let n = this.get();
    const resourceType = determineResourceType(id);
    const mutationId = `${this.id}-append-${Date.now()}`;
    if (resourceType === Resource.PointGoal) {
      const goals = n.goals.map((g) => {
        if (g.id == id) {
          g.blocks = [...(g.blocks ?? []), block];
          return g;
        }
        return g;
      });
      return this.modify(
        { goals },
        { queueParams: { isUseQueueFirstApproach: true, mutationId } }
      );
    }
    const tasks = n.tasks.map((t) => {
      if (t.id == id) {
        t.blocks = [...(t.blocks ?? []), block];
        return t;
      }
      return t;
    });
    return this.modify(
      { tasks },
      { queueParams: { isUseQueueFirstApproach: true, mutationId } }
    );
  }
  async updateTask(
    id: string,
    props: {
      estimated?: number;
      checked?: boolean;
    }
  ) {
    let n = this.get();
    const tasks = n.tasks.map((t) => {
      if (t.id == id) {
        t.estimated = props.estimated ?? t.estimated;
        t.checked = props.checked ?? t.checked;
        return t;
      }
      return t;
    });
    this.modify({ tasks });
    this.modify(n);
  }
  //TODO - with new changes
  async updateOrderValueForTasks(goalId: string, modifiedItems: any) {
    let n = this.get();
    if (n && n.goals.length > 0) {
      modifiedItems.forEach((item: any) => {
        let index = n.goals.findIndex((i) => i.taskId == item.taskId);
        if (n.goals[index].goalId == goalId) n.goals[index].order = item.order;
      });
    }
    this.modify(n);
  }
  //TODO - with new changes - use array index instead of order
  async updateOrderValueForFI(modifiedItems: any) {
    let n = this.get();
    if (!isValidArrayWithData(modifiedItems)) return;
    modifiedItems.forEach((item: any) => {
      if (item?.taskId) {
        let index = n.goals.findIndex((i: any) => i?.taskId == item.taskId);
        n.goals[index].order = item.order;
      } else {
        let index = n.goals.findIndex((i: any) => i?.goalId == item.goalId);
        n.goals[index].order = item.order;
      }
    });
    this.modify(n);
  }
  async removeTask(id: string) {
    let n = this.get();
    if (n && n.tasks.length > 0) {
      n.tasks = n.tasks.filter((t) => t.id != id);
    }
    if (n && n.goals.length > 0) {
      n.goals = n.goals.map((g) => {
        if (g.tasks && g.tasks?.length > 0) {
          g.tasks = g.tasks.filter((t) => t != id);
        }
        return g;
      });
    }
    this.modify(n);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async removeGoal(id: string) {
    let n = this.get();
    if (n && n.goals.length > 0) {
      n.goals = n.goals.filter((t) => t.id != id);
    }
    this.modify(n);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async propagateDependencyChanges(data: any) {
    logger.log({
      context: "propagateDependencyChanges to focusItemsStore",
      data
    });
    //TODO - check if any existing task or goal is dependent on this change - change of label for a goal or color etc
  }
}

export const focusItemsStore = new FocusItemsStore();

class PointSessionStore extends ResourceStore<IPointSession> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.PointSession, {
      cacheStrategy: CacheStrategy.NO_CACHE
    });
    this.db = new SurrealDatabase();
  }
  //TODO
  fetch = async (id: string) => {
    // const response = await dataManager.refreshResource(
    //   Resource.PointSession,
    //   id
    // );
    let response = await this.db.executeReadFn(
      "return array::first(select * from PointSession where id is $id);",
      {
        id
      }
    );
    return interceptSurrealResponse(response);
  };
  /**
   * Saves focus logs to the database. This function is called when user finishes a focus session delegated from active session store.
   * @param activeSession
   * @param focusItemStore
   * @param isClose
   */
  finishFocus() {
    const activeSession = sessionStore.get();
    const focusItemStore = focusItemsStore.get();
    const session: Partial<IPointSession> = {
      elapsed: activeSession.totalElapsed,
      extended: activeSession.totalExtended,
      start: activeSession.start?.toISOString() ?? "",
      end: new Date(
        (activeSession.start?.getTime() ?? 0) +
          activeSession.totalElapsed * 1000
      ).toISOString(),

      id: prefixTable(
        activeSession.currentSessionId ??
          generateSessionId(new Date().getTime()),
        Resource.PointSession
      ),
      plannedEnd: resolvePlannedEndTime(activeSession),
      type: activeSession.type,
      blocks: [
        ...activeSession.intervals,
        {
          id: generateUID(),
          start: new Date().getTime(),
          type: BlockType.NONE,
          progress: 0,
          duration: 0
        }
      ],
      focusItems: focusItemStore,
      notes: activeSession.notes
    };
    const logs: Partial<IPointLog>[] = [];

    focusItemStore.goals.forEach((g: IFocusGoal) => {
      if (g.blocks && g.blocks.length > 0) {
        logs.push(
          ...g.blocks.map((block) => {
            return generateLogFromBlock(g.id, "", block);
          })
        );
      }
      if (g.tasks && g.tasks.length > 0) {
        g.tasks.forEach((t) => {
          const task = focusItemStore.tasks.find((x) => x.id == t);
          if (!task) return;
          if (task.blocks && task.blocks.length > 0) {
            logs.push(
              ...task.blocks.map((block) => {
                return generateLogFromBlock(g.id, task.id, block);
              })
            );
          }
        });
      }
    });
    this.create(session, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-create`
      }
    });
    pointLogStore.create(logs, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-create-logs`
      }
    });

    // dataManager.performMutation(
    //   Resource.PointLog,
    //   {
    //     sessionData: session,
    //     logs,
    //     snapshot: {
    //       ...activeSession,
    //       id: prefixTable(Resource.pointSessionSnapshotv2, Resource.kv)
    //     },
    //     isClose
    //   },
    //   {
    //     action: PersistanceActionType.CUSTOM_QUERY,
    //     query:
    //       "fn::pointron::focus::finish::v4($sessionData, $logs, $snapshot, $isClose);"
    //   }
    // );

    function resolvePlannedEndTime(session: IActiveSessionStore) {
      if (session.type == SessionType.COUNTUP) {
        return "";
      } else if (session.end) return session.end.toISOString();
      else if (session.start) {
        return new Date(
          session.start.getTime() + session.plannedDuration * 1000
        ).toISOString();
      }
    }
    function generateLogFromBlock(
      goalId: string,
      taskId: string,
      block: { start: number; end: number }
    ) {
      const total = resolveTotalTaskTime([block]);
      const focus = resolveTaskFocus(session.blocks, [block]);
      console.log({ focus, blocks: deepCopy(session.blocks), total, block });
      const breakTime = total - focus;
      return {
        id: generateResourceId(Resource.PointLog),
        start: new Date(block.start).toISOString(),
        end: new Date(block.end).toISOString(),
        sessionId: session.id,
        goalId,
        taskId,
        totalFocus: focus,
        totalBreak: breakTime,
        tzOffset: get(userPreferences).timeZoneOffset,
        targets: get(pointronPreferences).horizonTargets
      };
    }
  }
}

export const pointSessionStore = new PointSessionStore();
