import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  type IActiveSessionStore,
  type ISessionInterval,
  BlockType,
  type IFocusItemsStore,
  type ICurrentFocusItem,
  type IFocusItem
} from "$lib/client/types/pointron/session.type";
import {
  generateIntervalsFromComposition,
  getTotalsFromComposition,
  refreshPredefinedIntervalsStartTime,
  resolveSessionTimeSplit
} from "$lib/client/products/pointron/pointron.utils";
import { get, writable } from "svelte/store";
import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
import { pointronPreferences } from "../pointron.store";
import {
  SessionCompositionType,
  type SessionComposition,
  BreakCompositionType
} from "$lib/client/types/pointron/sessionComposition.type";
import { appStore } from "$lib/client/stores/app.store";
import modalEvent, {
  fullScreen,
  player
} from "$lib/client/components/modal/modal.store";
import {
  toasts,
  scheduledNotifications,
  fullPageLoadingScreen,
  appEvents
} from "$lib/client/stores/notification.store";
import { deepCopy, isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { AlertType } from "$lib/client/types/notification.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import type {
  IRecordId,
  IResourceSelectAdditionalParams,
  IResourceSelectParams
} from "$lib/client/types/data.type";
import { logger } from "$lib/client/components/debug/logger.client";
import {
  type ISession,
  SessionType,
  type ISessionCapture,
  type ISessionLogCapture
} from "$lib/client/products/pointron/logs/log.type";
import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
import context from "$lib/client/stores/context.store";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import {
  determineResourceType,
  isSameResource,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { resolveTaskFocus, resolveTotalTaskTime } from "./session.utils";
import { postDataToParent } from "$lib/client/utils/embed.utils";
import { goalStore } from "$lib/client/components/goals/goal.store";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import { taskStore } from "$lib/client/components/tasks/task.store";
import { GoalStatus } from "$lib/client/components/goals/goal.type";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
import { uiState } from "$lib/client/stores/uiState/uiState.store";
import { UIState } from "$lib/client/stores/uiState/uiState.type";
import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";
import { EmbedDataMessage } from "$lib/client/types/embedMessage.enum";

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

/**
 * @deprecated - use preset name from preset item instead
 */
export const newPresetLabel = writable<string>("");

export const currentFocusItem = writable<ICurrentFocusItem | undefined>(
  undefined
);

const seedSessionStore: IActiveSessionStore = {
  currentSessionId: undefined,
  isQuickStartOn: false,
  type: SessionType.COUNTUP,
  state: SessionState.NOT_STARTED,
  timeElapsed: 0,
  totalElapsed: 0,
  totalIdle: 0,
  totalExtended: 0,
  plannedDuration: 0,
  intervals: [
    {
      id: generateSimpleRandomId(),
      start: new Date().getTime(),
      duration: 0.0001,
      progress: 1,
      type: BlockType.FOCUS
    }
  ],
  currentIdle: 0,
  isSessionRunning: false,
  currentBlockId: "",
  currentFocusItem: undefined,
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
    fullScreen.hide(false);
    player.reset();
    scheduledNotifications.reset();
  }

  /**
   * Completely resets the session store
   * @returns brand new session store with seed values
   */
  reset() {
    logger.log("session store reset");
    this.shallowReset();
    modalEvent.hide(PointronEvent.SESSION_FINISHED);
    modalEvent.hide(PointronEvent.BREAK_REMINDER);
    let newSession: IActiveSessionStore = deepCopy(seedSessionStore);
    newSession.notes = undefined;
    newSession.composition.breakReminder =
      get(pointronPreferences)?.breakReminder;
    return newSession;
  }

  private refreshNotifications(session: IActiveSessionStore) {
    scheduledNotifications.set([]);
    let sessionTimeRemaining: number | undefined = undefined;
    if (session.type != SessionType.COUNTUP) {
      sessionTimeRemaining = session.plannedDuration - session.totalElapsed;
      scheduleSessionFinishNotification();
    }
    let timeRemainingToTakeBreak: number | undefined = undefined;

    if (
      session.type != SessionType.PREDEFINED_INTERVALS &&
      session.state === SessionState.FOCUS_RUNNING
    ) {
      this.isIntervalTimeLimitNotified = scheduleBreakReminderNotification(
        this.isIntervalTimeLimitNotified
      );
      return timeRemainingToTakeBreak;
    }
    if (session.type === SessionType.PREDEFINED_INTERVALS) {
      const currentBlockIndex = session.intervals.findIndex(
        (x) => x.id == session.currentBlockId
      );
      const currentBlock = session.intervals[currentBlockIndex];
      if (!currentBlock?.duration) return;

      const timeRemainingForNextInterval =
        currentBlock.duration - session.timeElapsed;
      if (!timeRemainingForNextInterval) return;
      const title = currentBlock.type === BlockType.FOCUS ? "Focus" : "Break";
      const next = currentBlock.type === BlockType.FOCUS ? "break" : "focus";
      scheduledNotifications.push({
        inSeconds: timeRemainingForNextInterval,
        message: `${title} ended. Starting ${next}.`,
        timestamp: new Date().getTime() + timeRemainingForNextInterval * 1000,
        title: title + " ended.",
        sound: "ping.wav",
        id: "breakReminder"
      });
    }

    /**
     * Schedules the session finish notification.
     */
    function scheduleSessionFinishNotification() {
      // if (sessionTimeRemaining < 0) this.clearTimers();
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
      if (!sessionTimeRemaining) return;
      scheduledNotifications.push({
        inSeconds: sessionTimeRemaining,
        message: "Session time is up. Please extend or finish the session",
        timestamp: new Date().getTime() + sessionTimeRemaining * 1000,
        title: "Focus session time is up",
        sound: "dingding.mp3",
        id: "timeIsUp"
      });
    }

    /**
     * Schedules the break reminder notification based on current composition or fallback to the user preferences.
     * @returns time remaining to take break in seconds
     *
     * TODO - remind if no break taken - for multiples of the reminder...
     */
    function scheduleBreakReminderNotification(isNotified: boolean = false) {
      let breakReminderSetting =
        session.composition.breakType === BreakCompositionType.REMINDER
          ? (session.composition?.breakReminder ??
            get(pointronPreferences)?.breakReminder)
          : undefined;
      if (!breakReminderSetting) return isNotified;
      timeRemainingToTakeBreak = breakReminderSetting - session.timeElapsed;
      if (timeRemainingToTakeBreak < 0 && !isNotified) {
        appEvents.publish(PointronEvent.BREAK_REMINDER);
        isNotified = true;
      }
      if (
        !breakReminderSetting ||
        isNotified ||
        !timeRemainingToTakeBreak ||
        (session.type != SessionType.COUNTUP &&
          sessionTimeRemaining &&
          sessionTimeRemaining < timeRemainingToTakeBreak)
      )
        return isNotified;
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
      return isNotified;
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

  private _postNotificationsToEmbed() {
    const notifications = get(scheduledNotifications);
    postDataToParent(EmbedDataMessage.NOTIFICATIONS, notifications);
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
    let isFirstRun = true;
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
      if (isFirstRun) this._postNotificationsToEmbed();
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
          plannedDuration,
          intervals,
          end
        },
        { isPreventCachingDefault: true }
      );
      isFirstRun = false;
      if (isContinueSession) this._continueSession();
    }, 1000);
  }

  /**
   * Restores the state of the session for predefined intervals case.
   *
   * 500 milliseconds is substracted to increase reliability in cases of the excution of this method delegated from {@link _continueSession} method.
   *
   * @param session
   * @returns
   */
  private _restorePredefinedSessionState(session: IActiveSessionStore) {
    let currentInterval: ISessionInterval | undefined = undefined;
    const intervals = refreshPredefinedIntervalsStartTime(
      session.intervals,
      session.start!
    );
    const now = new Date().getTime();
    const bufferTime = 500;

    intervals.some((interval, index) => {
      if (
        interval.start - bufferTime <= now &&
        index === intervals.length - 1
      ) {
        logger.log("interval is last");
        currentInterval = interval;
        return true;
      }
      if (
        interval.start - bufferTime <= now &&
        intervals[index + 1]?.start - bufferTime > now
      ) {
        logger.log({ interval, index, nextOne: intervals[index + 1] });
        currentInterval = interval;
        return true;
      }
    });
    logger.log({ currentInterval, now });
    if (!currentInterval) return;
    currentInterval = currentInterval as ISessionInterval;
    this.modify(
      {
        intervals,
        currentBlockId: currentInterval.id,
        state:
          currentInterval.type === BlockType.FOCUS
            ? SessionState.FOCUS_RUNNING
            : SessionState.BREAK_RUNNING
      },
      { isPersist: false }
    );
  }

  /**
   * Continues the next interval in case of pre defined intervals.
   *
   * Changing the currentBlockId and state of the session is taken care of in {@link _resumeTimer} method - via {@link _restorePredefinedSessionState} method.
   */
  private async _continueSession() {
    let session = this.get();
    if (session.state == SessionState.FOCUS_RUNNING) {
      appEvents.publish(PointronEvent.INTERVAL_ENDED);
    } else {
      appEvents.publish(PointronEvent.BREAK_ENDED);
      this.isIntervalTimeLimitNotified = false;
    }
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
          id: generateSimpleRandomId(),
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
          id: generateSimpleRandomId(),
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
    logger.log({
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
          id: generateSimpleRandomId(),
          start: new Date().getTime(),
          duration: 0.0001,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
      sessionType = SessionType.COUNTUP;
    }
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

  /**
   * @deprecated - not used anywhere
   * @param n
   * @returns
   */
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
          : (currentLastBar.duration ?? 0 + params.timeElapsed)
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
          this.prefinishSession();
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
      this.prefinishSession();
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
    let newBlockId = generateSimpleRandomId();
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
        session.composition?.type !== SessionCompositionType.TARGET_FOCUS
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
        session.composition?.type === SessionCompositionType.TARGET_FOCUS
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

  /**
   *
   * Note: Not modifying `isQuickStartOn` state for finish session context as this is triggering refresh on QuickStart component and thus `isFinishingState` state on quick start thumbnail is being replaced which is not desirable.
   * @param props
   * @returns
   */
  private async _stopCurrentFocusItem(
    props: { isPersist?: boolean; isSessionFinish?: boolean; end?: number } = {
      isPersist: false
    }
  ) {
    let session = this.get();
    let currentFocus = get(currentFocusItem);
    if (!currentFocus) return;
    let end = props?.end ?? new Date().getTime();
    await focusItemsStore.appendFocusBlock(currentFocus.id, {
      start: currentFocus.start,
      end
    });
    currentFocusItem.set(undefined);
    return this.modify(
      {
        currentFocusItem: undefined,
        isQuickStartOn: props?.isSessionFinish ? session.isQuickStartOn : false
      },
      {
        isPersist: props.isPersist
      }
    );
  }

  async close() {
    logger.log({ context: "session store close" });
    focusItemsStore.reset(true);
    let session = this.reset();
    this.modify(session);
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
      const currentValue = this.get();
      modalEvent.hide(PointronEvent.SESSION_FINISHED);
      const isRestored = fullScreen.restore();
      if (!isRestored) player.showMini(PointronAction.FOCUS_PLAYER);
      this.modify(
        {
          ...savedSessionStore,
          timeElapsed: currentValue.timeElapsed,
          totalElapsed: currentValue.totalElapsed
        },
        { isPersist: false }
      );
      if (savedSessionStore.currentFocusItem) {
        currentFocusItem.set(savedSessionStore.currentFocusItem);
      }
      this._resumeTimer({
        isResetTimer: false
      });
    } else if (
      savedSessionStore.state === SessionState.FINISHED ||
      savedSessionStore.state === SessionState.PRE_FINISHED
    ) {
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

  /**
   * This is called when the session is auto finished without user interaction. This happens in cases of countdown or end time fixed sessions.
   *
   *Note:  This is used instead of finishSession directly as finishSession is causing unintented behavior when the app is left in the background or when the computer is in sleep state. In such cases, 100s of sessionLog entries are being created.
   */
  prefinishSession() {
    this.shallowReset();
    this.modify({
      state: SessionState.PRE_FINISHED,
      isSessionRunning: false
    });
    appEvents.publish(PointronEvent.SESSION_FINISHED);
  }

  async finishSession(params?: {
    isClose?: boolean;
    isQuickStartSwitch?: boolean;
  }) {
    let session = this.get();
    let currentFocus = get(currentFocusItem);
    if (!session.isQuickStartOn)
      fullPageLoadingScreen.show("Finishing session...");
    try {
      const now = new Date().getTime();
      if (currentFocus)
        await this._stopCurrentFocusItem({
          isSessionFinish: true,
          end: now
        });
      // let lastBlock = n.intervals?.pop();
      // if (lastBlock) {
      //   lastBlock.end = now;
      //   n.intervals = [...(n.intervals ?? []), lastBlock];
      // }
      // n.blocks = [...n.blocks, { start: now, duration: 0, progress: 1 }];
      // session.state = SessionState.FINISHED;
      // session.isSessionRunning = false;
      sessionStore.finishFocus({ end: now });
    } catch (err) {
      logger.error({ at: "finishSession", error: err });
    } finally {
      if (params?.isClose) {
        this.close();
      } else if (!params?.isQuickStartSwitch) {
        this.shallowReset();
        // this.propagateMessageToParent(session);
        currentFocusItem.set(undefined);
        this.modify({
          isSessionRunning: false,
          state: SessionState.FINISHED,
          currentFocusItem: undefined,
          isQuickStartOn: false
        });
        appEvents.publish(PointronEvent.SESSION_FINISHED);
      }
      fullPageLoadingScreen.hide();
    }
    return session;
  }

  async startTask(id: IRecordId) {
    let session = this.get();
    let currentFocus = get(currentFocusItem);
    if (currentFocus) await this._stopCurrentFocusItem();
    const newFocus = { start: new Date().getTime(), id };
    currentFocusItem.set(newFocus);
    this.modify(
      { currentFocusItem: newFocus },
      { isPersist: session.state != SessionState.BREAK_RUNNING }
    );
    if (session.state === SessionState.BREAK_RUNNING) {
      await this._resumeSession();
    }
  }

  async stopCurrentFocusItem() {
    await this._stopCurrentFocusItem({ isPersist: true });
  }

  resumeTimer(isResetTimer: boolean = true) {
    return this._resumeTimer({ isResetTimer });
  }

  async startBreak() {
    let session = this.get();
    if (session.state === SessionState.BREAK_RUNNING) return false;
    let intervals: ISessionInterval[] = [];
    let newBlockId = generateSimpleRandomId();
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
            id: generateSimpleRandomId(),
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

  /**
   * @deprecated - extend session is not supported
   */
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

  /**
   *
   * 1 ms buffer is added to currentFocus start to avoid task time calculation issue for predefined interval sessions. (The first item is not being shown with time incremented)
   *
   * @param isQuickStart
   * @returns
   */
  async startSession(isQuickStart: boolean = false) {
    this.onComposeComplete(false);
    if (isQuickStart) player.showMini(PointronAction.FOCUS_PLAYER);
    else fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);
    if (get(pointronPreferences).isEnableAutoPiP) {
      player.togglePip(PointronAction.FOCUS_PLAYER);
    }

    if (!get(context).isEmbed && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const sessionId = generateResourceId(Resource.session);
    this.isIntervalTimeLimitNotified = false;
    let currentFocus = get(currentFocusItem);
    let focusItems = focusItemsStore.get();
    if (!isQuickStart && focusItems.items.length > 0) {
      const item = focusItems.items.find(
        (x) => !x.tasks || x.tasks.length === 0
      );
      if (item) {
        currentFocus = {
          id: item.id,
          start: new Date().getTime() + 1
        };
        currentFocusItem.set(currentFocus);
      }
    }
    this.modify(
      {
        currentSessionId: sessionId,
        isSessionRunning: true,
        start: new Date(),
        state: SessionState.FOCUS_RUNNING,
        currentFocusItem: currentFocus
      },
      { isPersist: false }
    );
    this._resumeTimer();
    this.persist(undefined);
    return true;
  }

  isCurrentFocusItem(id: IRecordId, currentFocusItemParam?: ICurrentFocusItem) {
    if (!this.get().isSessionRunning) return false;
    const currentFocus = currentFocusItemParam ?? get(currentFocusItem);
    if (!currentFocus) return false;
    const resourceTypeOfCurrentFocus = determineResourceType(currentFocus.id);
    const resourceTypeOfItem = determineResourceType(id);
    if (
      resourceTypeOfCurrentFocus === Resource.goal ||
      resourceTypeOfItem === Resource.task
    ) {
      return isSameResource(id, currentFocus);
    } else if (resourceTypeOfCurrentFocus === Resource.task) {
      const correspondingGoal = get(focusItemsStore).items.find((x) =>
        x.tasks?.some(resourceInList(currentFocus))
      );
      if (correspondingGoal) {
        return isSameResource(correspondingGoal.id, id);
      }
      return false;
    }
  }

  async focusGoal(goalId: IRecordId) {
    if (this.isCurrentFocusItem(goalId)) return;
    const session = this.get();
    if (session.isSessionRunning && !session.isQuickStartOn) {
      await focusItemsStore.addGoal(goalId);
      await this.startTask(goalId);
    } else {
      await this.quickStart(goalId);
    }
  }

  async focusTask(taskId: IRecordId, goalId?: IRecordId) {
    if (this.isCurrentFocusItem(taskId)) return;
    await focusItemsStore.addTask(taskId, goalId);
    const session = this.get();
    if (!session.isSessionRunning) {
      await this.startSession();
    }
    await this.startTask(taskId);
  }

  /**
   * Starts a quick start session for a given goal.
   * @param goalId
   */
  async quickStart(goalId: IRecordId) {
    if (this.get().isSessionRunning)
      await activeSession.finishSession({ isQuickStartSwitch: true });
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
      const newFocus = { start: new Date().getTime(), id: goalId };
      currentFocusItem.set(newFocus);
      this.modify(
        {
          ...n,
          composition,
          type: SessionType.COUNTUP,
          end: undefined,
          plannedDuration: 0,
          isQuickStartOn: true,
          currentFocusItem: newFocus
        },
        { isPersist: false }
      );
      await focusItemsStore.addGoal(goalId);
      return this.startSession(true);
    } catch (err) {
      logger.error({ at: "quickStart", error: err });
    }
  }

  async onPresetSelection(preset: SessionComposition) {
    this.modify({ composition: preset }, { isPersist: false });
    this.onComposeComplete();
    if (preset.goals?.length) {
      await focusItemsStore.resetToPresetGoals(preset.goals);
    }
  }

  async resetComposition() {
    let composition = {
      id: generateSimpleRandomId(),
      type: SessionCompositionType.COUNTUP,
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

  async saveCurrentCompositionAsPreset(params: {
    goals: IRecordId[];
    name: string;
  }) {
    let n = this.get();
    if (!n.composition) return;
    const result = await pointronPreferences.addPreset({
      ...n.composition,
      name: params.name,
      id: generateSimpleRandomId(),
      goals: params.goals
    });
    toasts.success("Preset saved successfully");
    return result;
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
   * Resolves the current focus item data.
   * @param item
   * @returns
   */
  async resolveCurrentFocusItemData(
    params: {
      item?: ICurrentFocusItem;
      isReturnGoalIfTask?: boolean;
    } = {}
  ) {
    let item = params.item;
    if (!item) item = get(currentFocusItem);
    if (!item) return;
    const resourceType = determineResourceType(item.id);
    if (resourceType === Resource.goal) {
      const goal = await goalStore.selectMany(
        {
          filters: {
            id: item.id.toString()
          }
        },
        { isIncludeSubItems: true, isExpand: true }
      );
      return goal?.[0];
    } else if (resourceType === Resource.task) {
      const task = await taskStore.selectMany(
        {
          filters: {
            id: item.id.toString()
          }
        },
        { isExpand: true }
      );
      return task?.[0];
    }
  }
}

export const activeSession = new ActiveSessionStore();

export const lastActiveGoalIdForEditing = writable<IRecordId | undefined>(
  undefined
);

const seedFocusItemsStore: IFocusItemsStore = {
  items: [],
  removedItems: []
};

class FocusItemsStore extends KeyValueStore<IFocusItemsStore> {
  constructor() {
    super(Resource.sessionFocusItems, { ...seedFocusItemsStore });
  }

  loader(data: IFocusItemsStore) {
    if (!data.items) data.items = [];
    if (!data.removedItems) data.removedItems = [];
    super.loader(data);
  }

  reset(isPersist: boolean = false) {
    logger.log({ context: "focus items store - reset" });
    this.modify(
      { items: [], removedItems: [] },
      {
        isPersist
      }
    );
  }

  async refreshRecents(items: { id: IRecordId; startUnix: number }[]) {
    console.time("refreshRecents");
    const goalsResult = await goalStore.selectMany(
      {
        filters: {
          id: items.map((x) => x.id.toString()),
          status: {
            notEquals: GoalStatus.COMPLETED
          }
        }
      },
      {
        isExpand: true
      }
    );
    console.timeEnd("refreshRecents");
    const newRecents = items
      .map((x) => {
        const goal = goalsResult.find(resourceInList(x.id));
        if (!goal) return;
        return {
          id: x.id,
          item: goal,
          startUnix: x.startUnix
        };
      })
      .filter((k) => k && k.id && k.item);
    this.modify({ recents: newRecents });
  }

  async addNewTask(label: string, goalId?: IRecordId) {
    let id = generateResourceId(Resource.task);
    await this.addTask(id, goalId);
    return taskStore.save(
      {
        label,
        isChecked: false,
        goalId: goalId,
        dateUnix: new Date().getTime()
      },
      { id }
    );
  }

  async addTask(id: IRecordId, goalId?: IRecordId) {
    let n = this.get();
    if (n.items.some(resourceInList(id)))
      throw new Error("Task already exists");
    let blocks:
      | {
          start: number;
          end: number;
        }[]
      | undefined = undefined;
    const removedTask = n.removedItems?.find(resourceInList(id));
    if (removedTask) {
      n.removedItems =
        n.removedItems?.filter((item) => !isSameResource(item, id)) ?? [];
      blocks = removedTask.blocks ?? [];
    }

    if (goalId && !n.items.some(resourceInList(goalId))) {
      const removedGoal = n.removedItems?.find(resourceInList(goalId));
      if (removedGoal) {
        n.removedItems =
          n.removedItems?.filter((item) => !isSameResource(item, goalId)) ?? [];
        n.items.push({ ...removedGoal, tasks: [] });
      } else {
        n.items.push({ id: goalId, tasks: [], blocks: [] });
      }
    }

    this.modify({
      items: [
        ...(n.items.map((x: IFocusItem) => {
          if (goalId && isSameResource(x.id, goalId))
            x.tasks = [...(x.tasks ?? []), id];
          return x;
        }) ?? []),
        {
          id,
          tasks: [],
          blocks: [...(blocks ?? [])]
        }
      ]
    });
    if (goalId) lastActiveGoalIdForEditing.set(goalId);
  }

  async addGoal(id: IRecordId) {
    let n = this.get();
    if (n.items.some(resourceInList(id))) return;

    const removedGoal = n.removedItems?.find(resourceInList(id));
    if (removedGoal) {
      n.removedItems =
        n.removedItems?.filter((item) => !isSameResource(item, id)) ?? [];
      n.items.push(removedGoal);
    } else {
      n.items.push({ id, tasks: [], blocks: [] });
    }
    this.modify(n);
    lastActiveGoalIdForEditing.set(id);
  }
  async resetToPresetGoals(ids: IRecordId[]) {
    let n = this.get();
    n.items = ids.map((id) => ({ id, tasks: [], blocks: [] }));
    this.modify(n);
    lastActiveGoalIdForEditing.set(ids[0]);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }

  async appendFocusBlock(id: IRecordId, block: { start: number; end: number }) {
    let n = this.get();
    const items = n.items.map((item) => {
      if (isSameResource(item.id, id)) {
        item.blocks = [...(item.blocks ?? []), block];
        return item;
      }
      return item;
    });
    return this.modify({ items });
  }

  async removeFocusItem(id: IRecordId) {
    let n = this.get();
    if (!n || n.items.length === 0) return;
    const removedItem = n.items.find((item) => isSameResource(item.id, id));
    if (!removedItem) return;

    if (!n.removedItems) n.removedItems = [];
    const itemsToRemove = n.items.filter(
      (item) =>
        isSameResource(item.id, id) ||
        removedItem.tasks?.some(resourceInList(item.id))
    );
    n.removedItems.push(...itemsToRemove);

    n.items = n.items.filter(
      (item) =>
        !isSameResource(item.id, id) &&
        !removedItem.tasks?.some(resourceInList(item.id))
    );

    n.items = n.items.map((item) => {
      if (item.tasks && item.tasks?.length > 0) {
        item.tasks = item.tasks.filter((t) => !isSameResource(t, id));
      }
      return item;
    });

    this.modify(n);
  }

  async propagateDependencyChanges(data: any) {
    logger.log({
      context: "propagateDependencyChanges to focusItemsStore",
      data
    });
    //TODO - check if any existing task or goal is dependent on this change - change of label for a goal or color etc
  }

  resolveCount(items: IFocusItem[]) {
    //TODO - don't count goals with tasks as focus item
    return items.length;
  }

  async rearrangeFocusItems(fromId: IRecordId, toId: IRecordId) {
    let n = this.get();
    if (
      !fromId ||
      !toId ||
      !n.items.some(resourceInList(fromId)) ||
      !n.items.some(resourceInList(toId))
    ) {
      return;
    }
    const items = [...n.items];
    const fromIndex = items.findIndex((item) =>
      isSameResource(item.id, fromId)
    );
    const toIndex = items.findIndex((item) => isSameResource(item.id, toId));
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);
    console.log({ items, fromIndex, toIndex });
    this.modify({ items });
  }

  async rearrangeTasksInGoal(
    goalId: IRecordId,
    fromId: IRecordId,
    toId: IRecordId
  ) {
    let n = this.get();
    const goalItem = n.items.find(resourceInList(goalId));
    if (!goalItem || !goalItem.tasks || goalItem.tasks.length === 0) {
      return;
    }
    const fromIndex = goalItem.tasks.findIndex(resourceInList(fromId));
    const toIndex = goalItem.tasks.findIndex(resourceInList(toId));
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= goalItem.tasks.length ||
      toIndex >= goalItem.tasks.length
    ) {
      return;
    }
    const tasks = [...goalItem.tasks];
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);

    const items = n.items.map((item) => {
      if (isSameResource(item.id, goalId)) {
        return { ...item, tasks };
      }
      return item;
    });
    this.modify({ items });
  }
}

export const focusItemsStore = new FocusItemsStore();

class SessionStore extends ResourceStore<ISession, ISessionCapture> {
  constructor() {
    super(Resource.session, { indices: ["startUnix", "type"] });
  }

  async selectManyWithItemsExpansion(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    const result = await this.selectMany(params, additionalParams);
    if (!Array.isArray(result)) return;
    const itemIds = result
      .map((x) => x.items)
      ?.flat()
      ?.map((x) => x.id);
    if (itemIds && itemIds.length > 0) {
      const goalIds = itemIds.filter(
        (x) => determineResourceType(x) === Resource.goal
      );
      const taskIds = itemIds.filter(
        (x) => determineResourceType(x) === Resource.task
      );
      const goals = await goalStore.selectMany({
        filters: {
          id: goalIds
        }
      });
      const tasks = await taskStore.selectMany({
        filters: {
          id: taskIds
        }
      });
      result.map((x) => {
        if (x.items) {
          x.expandedItems = [...goals, ...tasks].filter((item) =>
            x.items.some(resourceInList(item))
          );
        }
      });
    }
    return result;
  }

  addToRecentFocusItems(logs: ISessionLogCapture[]) {
    const newEntries = logs
      .filter((x) => x.goalId && !x.taskId)
      .map((log) => ({
        id: log.goalId,
        startUnix: log.startUnix
      }));
    const newVal = [
      ...newEntries,
      ...(uiState.getState(UIState.recentFocusItems) ?? [])
    ]
      .filter(removeDuplicatesFilter)
      .slice(0, 15);
    uiState.setState(UIState.recentFocusItems, newVal);
    focusItemsStore.refreshRecents(newVal);
  }

  /**
   * Saves focus logs to the database. This function is called when user finishes a focus session delegated from active session store.
   * @param activeSession
   * @param focusItemStore
   * @param isClose
   */
  finishFocus(params?: { end?: number }) {
    const activeSessionVal = activeSession.get();
    const focusItemStore = focusItemsStore.get();
    const plannedEndTime = resolvePlannedEndTime(activeSessionVal);
    const endTime =
      plannedEndTime && new Date().getTime() > plannedEndTime.getTime()
        ? plannedEndTime
        : new Date(params?.end ?? new Date().getTime());

    const session: ISessionCapture = {
      elapsed: activeSessionVal.totalElapsed,
      extended: activeSessionVal.totalExtended,
      // start: activeSessionVal.start?.toISOString() ?? "",
      startUnix: activeSessionVal.start
        ? resolveUnixTimestamp(activeSessionVal.start)
        : 0,
      // end: endTime.toISOString(),
      endUnix: resolveUnixTimestamp(endTime),
      plannedEndUnix: plannedEndTime
        ? resolveUnixTimestamp(plannedEndTime)
        : undefined,
      id:
        activeSessionVal.currentSessionId ??
        generateResourceId(Resource.session),
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
      items: focusItemStore.items,
      notes: activeSessionVal.notes
    };
    const logs: ISessionLogCapture[] = [];

    // Process both active items and removed items to preserve all focus data
    const allItems = [
      ...focusItemStore.items,
      ...(focusItemStore.removedItems ?? [])
    ];

    allItems.forEach((item: IFocusItem) => {
      const resourceType = determineResourceType(item.id);
      const goalId =
        resourceType === Resource.goal
          ? item.id
          : (allItems.find((x) => x.tasks?.some(resourceInList(item.id)))?.id ??
            "");
      const taskId = resourceType === Resource.task ? item.id : "";
      if (item.blocks && item.blocks.length > 0) {
        logs.push(
          ...item.blocks.map((block) => {
            return generateLogFromBlock(goalId, taskId, block);
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
    console.log({ sessionTotals, remainingTime, totalTimeFromLogs });
    if (remainingTime > 0) {
      logs.push({
        id: generateResourceId(Resource.sessionLog),
        // start: new Date(session.start).toISOString(),
        // end: new Date(session.end).toISOString(),
        startUnix: session.startUnix,
        endUnix: session.endUnix,
        sessionId: session.id,
        focus: remainingTime,
        breakTime: 0
      });
    }
    this.create(session);
    sessionLogStore.create(logs, {
      context: PointronAction.FINISH_FOCUS_SESSION
    });
    this.addToRecentFocusItems(logs);

    function resolvePlannedEndTime(session: IActiveSessionStore) {
      if (session.type == SessionType.COUNTUP) {
        return;
      } else if (session.end) return session.end;
      else if (session.start) {
        return new Date(
          session.start.getTime() + session.plannedDuration * 1000
        );
      }
    }

    function generateLogFromBlock(
      goalId: IRecordId,
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
        // start: new Date(block.start).toISOString(),
        // end: new Date(block.end).toISOString(),
        startUnix: resolveUnixTimestamp(new Date(block.start)),
        endUnix: resolveUnixTimestamp(new Date(block.end)),
        sessionId: session.id,
        goalId,
        taskId,
        focus,
        breakTime
      };
    }
  }
}

export const sessionStore = new SessionStore();
