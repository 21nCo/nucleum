import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  type IActiveSessionStore,
  type ISessionInterval,
  BlockType,
  type IFocusGoal,
  type IFocusItemsStore,
  type ICurrentFocusItem
} from "$lib/client/types/pointron/session.type";
import {
  generateIntervalsFromComposition,
  getTotalsFromComposition,
  refreshPredefinedIntervalsStartTime
} from "$lib/client/products/pointron/pointron.utils";
import { get, writable } from "svelte/store";
import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
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
import type { IRecordId } from "$lib/client/types/data.type";
import { logger } from "$lib/client/components/debug/logger.client";
import {
  type ISessionLog,
  type ISession,
  SessionType
} from "$lib/client/products/pointron/logs/log.type";
import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
import { NodeType } from "$lib/client/products/memotron/node/node.type";
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
import { postToParent } from "$lib/client/utils/embed.utils";
import { goalStore } from "$lib/client/components/goals/goal.store";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";

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
          ? session.composition?.breakReminder ??
            get(pointronPreferences)?.breakReminder
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
    postToParent({
      notifications
    });
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
    props: { isPersist?: boolean; isSessionFinish?: boolean } = {
      isPersist: false
    }
  ) {
    let session = this.get();
    if (!session.currentFocusItem) return;
    let end = new Date().getTime();
    await focusItemsStore.appendFocusBlock(session.currentFocusItem.id, {
      start: session.currentFocusItem.start,
      end
    });
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
      if (session.currentFocusItem)
        await this._stopCurrentFocusItem({
          isSessionFinish: true
        });
      // let lastBlock = n.intervals?.pop();
      // if (lastBlock) {
      //   lastBlock.end = now;
      //   n.intervals = [...(n.intervals ?? []), lastBlock];
      // }
      // n.blocks = [...n.blocks, { start: now, duration: 0, progress: 1 }];
      // session.state = SessionState.FINISHED;
      // session.isSessionRunning = false;
      sessionStore.finishFocus();
    } catch (err) {
      logger.error(err);
    } finally {
      if (isClose) {
        this.close();
      } else {
        this.shallowReset();
        // this.propagateMessageToParent(session);
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
    if (session.currentFocusItem) await this._stopCurrentFocusItem();
    this.modify(
      { currentFocusItem: { start: new Date().getTime(), id } },
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

  async startSession(isQuickStart: boolean = false) {
    this.onComposeComplete(false);
    //TODO - if auto open enabled
    if (isQuickStart) player.showMini(PointronAction.FOCUS_PLAYER);
    else fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);

    if (!get(context).isEmbed && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const sessionId = generateResourceId(Resource.session);
    this.isIntervalTimeLimitNotified = false;
    let currentFocusItem = this.get().currentFocusItem;
    let focusItems = focusItemsStore.get();
    if (
      !isQuickStart &&
      (focusItems.todos.length > 0 || focusItems.goals.length > 0)
    ) {
      currentFocusItem = {
        id: focusItems.todos?.[0]?.id ?? focusItems.goals[0].id,
        start: new Date().getTime()
      };
    }
    this.modify(
      {
        currentSessionId: sessionId,
        isSessionRunning: true,
        start: new Date(),
        state: SessionState.FOCUS_RUNNING,
        currentFocusItem: currentFocusItem
      },
      { isPersist: false }
    );
    this._resumeTimer();
    this.persist(undefined);
    return true;
  }

  /**
   * Starts a quick start session for a given goal.
   * @param goalId
   */
  async quickStart(goalId: IRecordId) {
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
          currentFocusItem: { start: new Date().getTime(), id: goalId }
        },
        { isPersist: false }
      );
      await focusItemsStore.addGoal(goalId);
      return this.startSession(true);
    } catch (err) {
      logger.error(err);
    }
  }

  async onPresetSelection(preset: SessionComposition) {
    this.modify({ composition: preset }, { isPersist: false });
    this.onComposeComplete();
  }

  async resetComposition() {
    let composition = {
      id: generateSimpleRandomId(),
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
      id: generateSimpleRandomId()
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
   * Resolves the current focus item data.
   * @param item
   * @returns
   */
  async resolveCurrentFocusItemData(
    params: {
      item?: ICurrentFocusItem;
      isReturnTaskIfTodo?: boolean;
    } = {}
  ) {
    let item = params.item;
    if (!item) item = this.get().currentFocusItem;
    if (!item) return;
    const resourceType = determineResourceType(item.id);
    if (resourceType === Resource.task) {
      const task = await goalStore.select(item.id);
      return task;
    }
    return focusItemsStore.get().todos.find(resourceInList(item.id));
  }
}

export const activeSession = new ActiveSessionStore();

export const lastActiveGoalIdForEditing = writable<IRecordId | undefined>(
  undefined
);

const seedFocusItemsStore: IFocusItemsStore = {
  goals: [],
  todos: []
};

class FocusItemsStore extends KeyValueStore<IFocusItemsStore> {
  constructor() {
    super(Resource.sessionFocusItems, { ...seedFocusItemsStore });
  }
  reset(isPersist: boolean = false) {
    logger.log({ context: "focus items store - reset" });
    this.modify(
      { goals: [], todos: [] },
      {
        isPersist
      }
    );
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }

  async addTodo(label: string, goalId: IRecordId) {
    let n = this.get();
    //TODO - create todo record if new
    let id = generateResourceId(Resource.todo);
    this.modify({
      goals: n.goals.map((x: IFocusGoal) => {
        if (isSameResource(x.id, goalId)) x.todos = [...(x.todos ?? []), id];
        return x;
      }),
      todos: [
        ...(n.todos ?? []),
        {
          label,
          id
        }
      ]
    });
    if (goalId) lastActiveGoalIdForEditing.set(goalId);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }

  async addGoal(id: IRecordId) {
    let n = this.get();
    if (n.goals.some(resourceInList(id))) return;
    n.goals.push({ id, todos: [], blocks: [] });
    this.modify(n);
    lastActiveGoalIdForEditing.set(id);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }

  async updateTodoLabel(id: IRecordId, label: string) {
    let n = this.get();
    const todos = n.todos.map((t) => {
      if (isSameResource(t, id)) {
        t.label = label;
        return t;
      }
      return t;
    });
    //TODO - debounce at source, propagate change to todo record
    this.modify({ todos }, { isDebouncedPersist: true });
  }

  async appendFocusBlock(id: IRecordId, block: { start: number; end: number }) {
    let n = this.get();
    const resourceType = determineResourceType(id);
    if (resourceType === Resource.goal) {
      const goals = n.goals.map((g) => {
        if (isSameResource(g.id, id)) {
          g.blocks = [...(g.blocks ?? []), block];
          return g;
        }
        return g;
      });
      return this.modify({ goals });
    }
    const todos = n.todos.map((t) => {
      if (isSameResource(t.id, id)) {
        t.blocks = [...(t.blocks ?? []), block];
        return t;
      }
      return t;
    });
    return this.modify({ todos });
  }

  async updateTodo(
    id: IRecordId,
    props: {
      estimated?: number;
      checked?: boolean;
    }
  ) {
    let n = this.get();
    const todos = n.todos.map((t) => {
      if (isSameResource(t.id, id)) {
        t.estimated = props.estimated ?? t.estimated;
        t.checked = props.checked ?? t.checked;
        return t;
      }
      return t;
    });
    //TODO - propagate change to todo record
    this.modify({ todos });
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

  async removeTodo(id: IRecordId) {
    let n = this.get();
    if (n && n.todos.length > 0) {
      n.todos = n.todos.filter((t) => !isSameResource(t.id, id));
    }
    if (n && n.goals.length > 0) {
      n.goals = n.goals.map((g) => {
        if (g.todos && g.todos?.length > 0) {
          g.todos = g.todos.filter((t) => !isSameResource(t, id));
        }
        return g;
      });
    }
    this.modify(n);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }

  async removeGoal(id: IRecordId) {
    let n = this.get();
    if (n && n.goals.length > 0) {
      n.goals = n.goals.filter((t) => !isSameResource(t.id, id));
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

class SessionStore extends ResourceStore<ISession> {
  constructor() {
    super(Resource.session);
  }

  /**
   * Saves focus logs to the database. This function is called when user finishes a focus session delegated from active session store.
   * @param activeSession
   * @param focusItemStore
   * @param isClose
   */
  finishFocus() {
    const activeSessionVal = activeSession.get();
    const focusItemStore = focusItemsStore.get();
    const plannedEndTime = resolvePlannedEndTime(activeSessionVal);
    const endTime =
      plannedEndTime && new Date().getTime() > plannedEndTime.getTime()
        ? plannedEndTime
        : new Date();

    const session: OmitForCaptureWithId<ISession> = {
      elapsed: activeSessionVal.totalElapsed,
      extended: activeSessionVal.totalExtended,
      start: activeSessionVal.start?.toISOString() ?? "",
      end: endTime.toISOString(),
      id:
        activeSessionVal.currentSessionId ??
        generateResourceId(Resource.session),
      plannedEnd: plannedEndTime?.toISOString(),
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
      goals: focusItemStore.goals,
      notes: activeSessionVal.notes
    };
    const logs: OmitForCaptureWithId<ISessionLog>[] = [];

    focusItemStore.goals.forEach((g: IFocusGoal) => {
      if (g.blocks && g.blocks.length > 0) {
        logs.push(
          ...g.blocks.map((block) => {
            return generateLogFromBlock(g.id, "", block);
          })
        );
      }
      if (g.todos && g.todos.length > 0) {
        g.todos.forEach((t) => {
          const todo = focusItemStore.todos.find((x) => x.id == t);
          if (!todo) return;
          if (todo.blocks && todo.blocks.length > 0) {
            logs.push(
              ...todo.blocks.map((block) => {
                return generateLogFromBlock(g.id, todo.id, block);
              })
            );
          }
        });
      }
    });
    this.create(session);
    sessionLogStore.create(logs);

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
      todoId: IRecordId,
      block: { start: number; end: number }
    ): OmitForCaptureWithId<ISessionLog> {
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
        start: new Date(block.start).toISOString(),
        end: new Date(block.end).toISOString(),
        sessionId: session.id,
        goalId: goalId,
        todoId: todoId,
        totalFocus: focus,
        totalBreak: breakTime
        //TODO - check the need for the below
        // tzOffset: get(userPreferences).timeZoneOffset,
        // targets: get(pointronPreferences).horizonTargets
      };
    }
  }
}

export const sessionStore = new SessionStore();
