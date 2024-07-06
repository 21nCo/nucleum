import { Item } from "$lib/client/types/item.enum";
import {
  type ISessionStore,
  type IntervalBlock,
  BlockType,
  type FocusLog,
  type FocusItem,
  type IFocusItemsStore
} from "$lib/client/types/pointron/session.type";
import { generateSessionId, generateUID } from "$lib/client/utils/utils";
import {
  calculateTotalFocusAndBreak,
  generateBarsFromComposition,
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
import { appStore } from "$lib/client/stores/app.store";
import modalEvent from "$lib/client/components/modal/modal.store";
import {
  toasts,
  scheduledNotifications,
  fullPageLoadingScreen,
  appEvents
} from "$lib/client/stores/notification.store";
import {
  customColor,
  retrieveCurrentColors
} from "$lib/client/utils/theme.utils";
import { deepCopy, isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { postToParent } from "$lib/client/utils/embed.utils";
import { AlertType } from "$lib/client/types/notification.type";
import { isValidString } from "$lib/client/utils/text.utils";
import { DependencySyncType } from "$lib/client/types/data.type";
import { logger } from "$lib/client/stores/log.store";
import appearance from "$lib/client/stores/appearance.store";
import { SessionType } from "$lib/client/products/pointron/logs/log.type";
import { pointLogStore } from "$lib/client/products/pointron/logs/log.store";
import { NodeType } from "$lib/client/types/memotron/node.type";
import { FocusPersistence } from "./focus.persistence";
import context from "$lib/client/stores/context.store";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { KeyValueStore } from "$lib/client/stores/kv.store";
const focusPersistance = new FocusPersistence();

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

export const sessionChangeEvent = writable<{ id: string | null }>({ id: null });
export const newPresetLabel = writable<string>("");

const seedSessionStore: ISessionStore = {
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
  blocks: [
    {
      duration: 0.0001,
      progress: 1,
      type: BlockType.FOCUS
    }
  ],
  logs: [],
  currentLog: {
    start: 0
  },
  currentIdle: 0,
  isSessionRunning: false,
  currentBlock: {
    index: 0,
    start: 0,
    duration: 0,
    type: BlockType.FOCUS
  },
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

class SessionStore extends KeyValueStore<ISessionStore> {
  timer: any;
  idleTimer: any;
  isIntervalTimeLimitNotified: boolean = false;
  constructor() {
    super(
      Item.pointSessionSnapshot,
      { ...seedSessionStore },
      {
        priorityRefreshOnAppAppear: true,
        isPreventAutoPersist: true
      }
    );
  }
  propagateMessageToParent(n: ISessionStore) {
    try {
      const todayFocus = get(todayFocusStore)?.focus;
      const isFocusing = n.currentBlock.type == BlockType.FOCUS;
      const appearanceConfig = get(appearance);
      const colors = retrieveCurrentColors(appearanceConfig);
      const widgetSnapshot = {
        goalName: n.currentLog?.taskName,
        color:
          isFocusing && n.currentLog.color
            ? customColor(appearanceConfig, n.currentLog.color)
            : isFocusing
              ? colors.aps1
              : colors.ass1,
        start:
          n.currentBlock.type == BlockType.FOCUS
            ? n.start?.toISOString()
            : new Date(n.currentBlock.start)?.toISOString(),
        end: n.end?.toISOString(),
        isSessionRunning: n.isSessionRunning,
        isFocusing,
        todayFocus
      };
      postToParent({
        session: JSON.stringify(widgetSnapshot)
      });
      setTimeout(() => {
        const notifications = get(scheduledNotifications);
        postToParent({
          notifications
        });
      }, 2000);
      return widgetSnapshot;
    } catch (error) {
      logger.logError(error);
    }
  }
  /**
   * TODO - using KeyValueStore instead?
   * @param n
   * @returns
   */
  async __persist(n: ISessionStore | undefined = undefined) {
    if (!n) n = this.get();
    n.widgetSnapshot = this.propagateMessageToParent(n);
    //TODO - test if using modify which reasigns the store value is impacting any existing logic
    // let response = await dataManager.performMutation(
    //   Item.pointSessionSnapshot,
    //   n,
    //   { action: PersistanceActionType.MERGE }
    // );
    // dataManager.cache(n);
    let response = await this.modify(n);
    return response;
  }
  private clearTimers() {
    clearInterval(this.timer);
    clearInterval(this.idleTimer);
  }
  shallowReset() {
    this.clearTimers();
    sessionChangeEvent.set({ id: null });
    appStore.hideFullScreenPlayer(true);
    scheduledNotifications.reset();
  }
  /**
   * Completely resets the session store
   * @returns brand new session store with seed values
   */
  reset() {
    this.shallowReset();
    modalEvent.hideSpecific(PointronEvent.SESSION_FINISHED);
    modalEvent.hideSpecific(PointronEvent.BREAK_REMINDER);
    let newSession: ISessionStore = deepCopy(seedSessionStore);
    newSession.composition.breakReminder =
      get(pointronPreferences).breakReminder;
    return newSession;
  }
  private async _startSession(n: ISessionStore) {
    if (!get(context).isEmbed && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const sessionId = generateSessionId(new Date().getTime());
    n.currentSessionId = sessionId;
    n = this.updateBlocks(n, BlockType.FOCUS);
    this.isIntervalTimeLimitNotified = false;
    n.start = new Date();
    n = await this._resumeTimer(n, { isPersist: false });
    await this.__persist(n);
    sessionChangeEvent.set({ id: sessionId });
    return n;
  }
  refreshNotifications(n: ISessionStore) {
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
    if (
      n.type != SessionType.PREDEFINED_INTERVALS &&
      n.state === SessionState.FOCUS_RUNNING
    ) {
      breakReminderSetting =
        n.composition.breakType === BreakCompositionType.REMINDER
          ? n.composition.breakReminder ??
            get(pointronPreferences).breakReminder
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
      let currentBlock = n.blocks[n.currentBlock.index];
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
      let currentBlock = n.blocks[n.currentBlock.index];
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
  private async _resumeTimer(
    n: ISessionStore,
    options: { isPersist?: boolean; isResetTimer?: boolean } = {
      isPersist: true,
      isResetTimer: true
    }
  ) {
    if (options.isResetTimer) n.timeElapsed = 0;
    this.clearTimers();
    this.timer = setInterval(() => {
      const currentTime = new Date().getTime();
      n.totalElapsed = (currentTime - n.start!.getTime()) / 1000 - n.totalIdle;
      n.timeElapsed = (currentTime - n.currentBlock.start) / 1000;
      n.timeRemainingToTakeBreak = this.refreshNotifications(n);
      n.sessionProgress = this.refreshSessionProgress(n) ?? 0;
      if (
        n.type === SessionType.COUNTDOWN &&
        n.composition?.type == SessionCompositionType.TARGET_FOCUS &&
        n.currentBlock.type === BlockType.BREAK
      ) {
        let breakBlock = n.blocks[n.currentBlock.index];
        if (breakBlock) {
          breakBlock.duration = (currentTime - n.currentBlock.start) / 1000;
          n.plannedDuration = getTotalsFromComposition({
            bars: n.blocks
          })?.duration;
        }
      }
      const { blocks, isContinueSession } = this.refreshProgressOnBars(n);
      n.blocks = blocks;
      sessionStore.set(n);
      if (isContinueSession) this._continueSession(n);
    }, 1000);
    if (options.isPersist) await this.__persist(n);
    return n;
  }
  /**
   * Calculates blocks and total duration of the session based on composition seelction.
   * @param n sessionStore
   * @returns blocks - updated sessionStore
   */
  composeSession(n: ISessionStore) {
    let blocks: IntervalBlock[] = [];
    if (
      n.composition &&
      n.composition.type === SessionCompositionType.COUNTUP
    ) {
      countup();
    } else if (
      n.composition &&
      n.composition.type != SessionCompositionType.SLIDER
    ) {
      if (
        (n.composition?.numberOfFocusRounds &&
          n.composition.numberOfFocusRounds > 20) ||
        (n.composition?.numberOfBreaks && n.composition.numberOfBreaks > 20)
      ) {
        toasts.trigger({
          message:
            "Too many rounds selected: " + n.composition.numberOfFocusRounds,
          type: AlertType.ERROR,
          id: generateUID(),
          callback: () => {
            n.composition.numberOfFocusRounds = 1;
            n.composition.numberOfBreaks = 1;
          }
        });
        return n;
      }
      blocks = generateBarsFromComposition(n.composition);
      if (blocks.length > 1) n.type = SessionType.PREDEFINED_INTERVALS;
      else if (blocks.length === 1) n.type = SessionType.COUNTDOWN;
      n.plannedDuration = getTotalsFromComposition({
        bars: blocks
      })?.duration;
    } else if (n.type === SessionType.COUNTDOWN && n.plannedDuration) {
      blocks = [
        {
          duration: n.plannedDuration,
          progress: 0,
          type: BlockType.FOCUS
        }
      ];
    } else if (n.type === SessionType.COUNTUP) {
      countup();
    }
    if (!isValidArrayWithData(blocks)) {
      countup();
    }
    n.currentBlock.duration = blocks[0].duration ?? 0;
    n.blocks = blocks;
    return n;

    function countup() {
      blocks = [
        {
          duration: 0.0001,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
      n.type = SessionType.COUNTUP;
    }
  }
  /**
   * updates start and end time of current and previous blocks along with current log.
   * @param n sessionStore
   * @param type currentBlock type whether focus or break
   * @returns updated sessionStore
   */
  updateBlocks(n: ISessionStore, type: BlockType) {
    n.currentBlock.start = new Date().getTime();
    n.currentBlock.type = type;
    n.currentBlock.duration = n.blocks[n.currentBlock.index]?.duration ?? 0;
    if (n.type === SessionType.PREDEFINED_INTERVALS) {
      let previousBlock = n.blocks[n.currentBlock.index - 1];
      if (previousBlock) {
        previousBlock.end = new Date().getTime();
        n.blocks[n.currentBlock.index - 1] = previousBlock;
      }
    } else {
      let currentBlock = n.blocks?.pop();
      let previousBlock = n.blocks?.pop();
      if (previousBlock && currentBlock) {
        previousBlock.end = new Date().getTime();
        n.blocks = [...(n.blocks ?? []), previousBlock, currentBlock];
      } else if (currentBlock) {
        currentBlock.end = new Date().getTime();
        n.blocks = [...(n.blocks ?? []), currentBlock];
      }
    }
    if (!n.blocks[n.currentBlock.index]?.start) {
      n.blocks[n.currentBlock.index] = {
        ...n.blocks[n.currentBlock.index],
        start: n.currentBlock.start
      };
    }
    n.isSessionRunning = true;
    if (type == BlockType.FOCUS) {
      n.state = SessionState.FOCUS_RUNNING;
    } else if (type == BlockType.BREAK) {
      n.state = SessionState.BREAK_RUNNING;
    }
    if (n.currentLog.start != 0) {
      let lastLogBlock = n.currentLog.blocks?.pop();
      if (lastLogBlock) {
        lastLogBlock.end = new Date().getTime();
        n.currentLog.blocks = [...(n.currentLog.blocks ?? []), lastLogBlock];
      }
      n.currentLog.blocks = [
        ...(n.currentLog.blocks ?? []),
        {
          start: new Date().getTime(),
          type
        }
      ];
    }
    return n;
  }
  private async _continueSession(n: ISessionStore) {
    if (n.state == SessionState.FOCUS_RUNNING) {
      appEvents.publish(PointronEvent.INTERVAL_ENDED);
      n = this.updateBlocks(n, BlockType.BREAK);
    } else {
      appEvents.publish(PointronEvent.BREAK_ENDED);
      n = this.updateBlocks(n, BlockType.FOCUS);
      this.isIntervalTimeLimitNotified = false;
    }
    n = await this._resumeTimer(n);
    return n;
  }
  resolveEndTime(n: ISessionStore) {
    if (!n.start) return;
    if (n.composition?.type == SessionCompositionType.END_TIME_FIXED) {
      return n.end;
    } else if (n.composition?.type == SessionCompositionType.TARGET_FOCUS) {
      //todo
    } else {
      return new Date(
        n.start.getTime() + (n.plannedDuration + n.totalIdle) * 1000
      );
    }
  }
  refreshSessionProgress(n: ISessionStore) {
    if (n.type == SessionType.COUNTUP) return 100;
    if (!n.start || !n.end) return;
    return (
      (n.totalElapsed / ((n.end?.getTime() - n.start?.getTime()) / 1000)) * 100
    );
  }
  runIdleTimer(n: ISessionStore) {
    // if (n.currentIdle) {
    //   idleTimer = setInterval(() => {
    //     n.totalIdle += 1;
    //     sessionStore.set(n);
    //   }, 1000);
    // }
  }
  startIdleTime(n: ISessionStore) {
    this.clearTimers();
    n.currentIdle = new Date().getTime();
    this.runIdleTimer(n);
    return n;
  }
  clearIdle(n: ISessionStore) {
    let now = new Date().getTime();
    n.totalIdle += (now - n.currentIdle) / 1000;
    n.currentIdle = 0;
    if (this.idleTimer) clearInterval(this.idleTimer);
    return n;
  }
  refreshProgressOnBars(n: ISessionStore): {
    blocks: IntervalBlock[];
    isContinueSession: boolean;
  } {
    let isContinueSession = false;
    if (n.type == SessionType.COUNTUP) {
      if (n.blocks && n.blocks.length < 1)
        return { blocks: n.blocks, isContinueSession };
      const currentLastBar = n.blocks.pop();
      if (!currentLastBar) return { blocks: n.blocks, isContinueSession };
      let lastBar = {
        ...currentLastBar,
        duration: currentLastBar.start
          ? (new Date().getTime() - currentLastBar.start) / 1000
          : currentLastBar.duration ?? 0 + n.timeElapsed
      };
      return { blocks: [...n.blocks, lastBar], isContinueSession };
    }
    let totalElapsedRemaining = +n.totalElapsed.toFixed(0);
    let newBars: Array<IntervalBlock> = [];
    n.blocks.forEach((bar) => {
      let barDuration = bar.duration ?? 0;
      let refreshedProgress = 0;
      if (barDuration == totalElapsedRemaining) {
        refreshedProgress = 1;
        totalElapsedRemaining = 0;
        //todo - fix this - creating infinite loop
        this.clearTimers();
        if (n.currentBlock.index == n.blocks.length - 1) {
          this.finishSession();
        } else if (get(pointronPreferences).isEnableAutoStartInterval) {
          n.currentBlock.index += 1;
          isContinueSession = true;
        } else {
          n.state =
            n.state === SessionState.FOCUS_RUNNING
              ? SessionState.FOCUS_COMPLETED
              : SessionState.BREAK_COMPLETED;
          n.currentBlock.index += 1;
          if (n.state === SessionState.FOCUS_COMPLETED) {
            appEvents.publish(PointronEvent.INTERVAL_ENDED);
          } else if (n.state === SessionState.BREAK_COMPLETED) {
            appEvents.publish(PointronEvent.BREAK_ENDED);
          }
          this.startIdleTime(n);
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
    return { blocks: newBars, isContinueSession };
  }
  private async _resumeSession(n: ISessionStore) {
    if (n.state === SessionState.FOCUS_RUNNING) return n;
    if (n.state === SessionState.BREAK_COMPLETED) {
      n = this.clearIdle(n);
    }
    if (n.type == SessionType.COUNTUP) {
      n.blocks = [
        ...n.blocks,
        {
          start: new Date().getTime(),
          duration: 0,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
      n.currentBlock.index += 1;
    } else if (n.state === SessionState.BREAK_RUNNING) {
      let oldBars = n.blocks;
      n.blocks = [];
      n.blocks = oldBars.slice(0, n.currentBlock.index);
      n.blocks = [
        ...n.blocks,
        {
          start: oldBars[n.currentBlock.index].start,
          duration: n.timeElapsed,
          progress: 1,
          type: BlockType.BREAK
        }
      ];
      if (n.type === SessionType.COUNTDOWN) {
        n.blocks = [
          ...n.blocks,
          {
            start: new Date().getTime(),
            duration: n.currentBlock.duration - n.timeElapsed,
            progress: 0,
            type: BlockType.FOCUS
          }
        ];
      }
      n.blocks = n.blocks.concat(oldBars.slice(n.currentBlock.index + 1));
      n.currentBlock.index += 1;
    } else if (n.state === SessionState.FOCUS_COMPLETED) {
      //todo - check for accuracy
      let oldBars = n.blocks;
      n.blocks = [];
      n.blocks = oldBars.slice(0, n.currentBlock.index);
      n.blocks = n.blocks.concat(oldBars.slice(n.currentBlock.index + 1));
    }
    n = this.updateBlocks(n, BlockType.FOCUS);
    this.isIntervalTimeLimitNotified = false;
    n = await this._resumeTimer(n);
    return n;
  }
  private async _stopCurrentTaskOrGoal(
    n: ISessionStore,
    isSessionFinish: boolean = false
  ) {
    if (n.isQuickStartOn) n.isQuickStartOn = false;
    let end = new Date().getTime();
    let lastBlock = n.currentLog?.blocks?.pop();
    if (lastBlock) {
      lastBlock.end = end;
      n.currentLog.blocks = [...(n.currentLog?.blocks ?? []), lastBlock];
    }
    if ((n.currentLog.taskId || n.currentLog.goalId) && n.blocks) {
      let duration = calculateTotalFocusAndBreak(n.currentLog.blocks);
      if (!isSessionFinish)
        await focusItemsStore.updateWorkedTime(
          isValidString(n.currentLog.taskId)
            ? n.currentLog.taskId!
            : n.currentLog.goalId ?? "",
          duration.focus
        );
      n.currentLog.totalFocus = duration.focus;
      n.currentLog.totalBreak = duration.brek;
    }
    n.logs = [...n.logs, { ...n.currentLog, end }];
    n.currentLog = { start: 0, taskId: "", goalId: "" };
    return n;
  }

  async close(isPersist: boolean = true) {
    //TODO - resetSession - via - dataManager.performMutation
    let result = undefined;
    if (isPersist) result = await focusPersistance.resetSession();
    if (result?.todayFocus)
      todayFocusStore.set({
        focus: result.todayFocus,
        streak: result.streak
      });
    focusItemsStore.reset();
    let n = this.reset();
    this.modify(n, { isPersist: false });
    this.propagateMessageToParent(n);
    appEvents.publish(PointronEvent.SESSION_CLOSED);
    return (isPersist && result) || n;
  }
  async loader(savedSessionStore: ISessionStore) {
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
      savedSessionStore = await this._resumeTimer(savedSessionStore, {
        isPersist: false,
        isResetTimer: false
      });
    } else if (savedSessionStore.state === SessionState.FINISHED) {
      this.shallowReset();
      appStore.runAction(PointronEvent.SESSION_FINISHED);
      this.modify(savedSessionStore, { isPersist: false });
    } else {
      focusItemsStore.reset();
      savedSessionStore = this.reset();
      this.modify(savedSessionStore, { isPersist: false });
    }
    this.propagateMessageToParent(savedSessionStore);
  }
  loadEmptyState() {
    this.modify(this.reset(), { isPersist: false });
    this.propagateMessageToParent(this.get());
  }
  async finishSession(isClose: boolean = false) {
    let n = this.get();
    if (!n.isQuickStartOn) fullPageLoadingScreen.show("Finishing session...");
    try {
      const now = new Date().getTime();
      if (!n.currentLog.end) n.currentLog.end = now;
      if (n.currentLog.start != 0) await this._stopCurrentTaskOrGoal(n, true);
      let lastBlock = n.blocks?.pop();
      if (lastBlock) {
        lastBlock.end = now;
        n.blocks = [...(n.blocks ?? []), lastBlock];
      }
      // n.blocks = [...n.blocks, { start: now, duration: 0, progress: 1 }];
      n.state = SessionState.FINISHED;
      n.isSessionRunning = false;
      pointLogStore.finishFocus(n, focusItemsStore.get(), isClose);
    } catch (err) {
      logger.logError(err);
    } finally {
      if (isClose) {
        this.close(false);
      } else {
        this.shallowReset();
        this.propagateMessageToParent(n);
        this.modify(n, { isPersist: false });
        appEvents.publish(PointronEvent.SESSION_FINISHED);
      }
      fullPageLoadingScreen.hide();
    }
    return n;
  }
  async startTask(
    id: string,
    taskName: string,
    color: number | undefined,
    goalId: string | undefined = undefined
  ) {
    const newLog: FocusLog = {
      taskId: id,
      goalId,
      taskName,
      color,
      start: new Date().getTime(),
      blocks: [
        {
          start: new Date().getTime(),
          type: BlockType.FOCUS
        }
      ]
    };
    let n = this.get();
    if (n.currentLog.start != 0) await this._stopCurrentTaskOrGoal(n);
    n.currentLog = newLog;
    if (n.state === SessionState.BREAK_RUNNING) {
      n = await this._resumeSession(n);
    } else {
      this.__persist(n);
    }
    this.modify(n, { isPersist: false });
  }
  async startGoal(id: string, goalName: string, color: number | undefined) {
    let n = this.get();
    if (n.currentLog.start != 0) await this._stopCurrentTaskOrGoal(n);
    n.currentLog = {
      goalId: id,
      taskName: goalName,
      taskId: "",
      color,
      start: new Date().getTime(),
      blocks: [
        {
          start: new Date().getTime(),
          type: BlockType.FOCUS
        }
      ]
    };
    if (n.state === SessionState.BREAK_RUNNING) {
      n = await this._resumeSession(n);
    } else {
      this.__persist(n);
    }
    this.modify(n, { isPersist: false });
  }
  async stopCurrentTaskOrGoal() {
    let n = this.get();
    const newValue = await this._stopCurrentTaskOrGoal(n);
    this.modify(newValue, { isPersist: false });
    return this.__persist(newValue);
  }
  async resumeTimer(isResetTimer: boolean = true) {
    let n = this.get();
    n = await this._resumeTimer(n, { isResetTimer });
    this.modify(n, { isPersist: false });
  }
  async startBreak() {
    let n = this.get();
    if (n.state === SessionState.BREAK_RUNNING) return false;
    if (n.state === SessionState.FOCUS_COMPLETED) {
      n = this.clearIdle(n);
    }
    if (n.type == SessionType.COUNTUP) {
      n.blocks = [
        ...n.blocks,
        {
          start: new Date().getTime(),
          duration: 0,
          progress: 1,
          type: BlockType.BREAK
        }
      ];
      n.currentBlock.index += 1;
    } else if (
      n.type === SessionType.COUNTDOWN ||
      n.state === SessionState.FOCUS_RUNNING
    ) {
      let oldBars = n.blocks;
      n.blocks = [];
      n.blocks = oldBars.slice(0, n.currentBlock.index);
      n.blocks = [
        ...n.blocks,
        {
          start: oldBars[n.currentBlock.index].start,
          duration: n.timeElapsed,
          progress: 1,
          type: BlockType.FOCUS
        }
      ];
      if (
        n.type == SessionType.COUNTDOWN &&
        n.composition?.type == SessionCompositionType.TARGET_FOCUS
      ) {
        n.blocks = [
          ...n.blocks,
          {
            start: new Date().getTime(),
            duration: 0,
            progress: 0,
            type: BlockType.BREAK
          },
          {
            duration: n.currentBlock.duration - n.timeElapsed,
            progress: 0,
            type: BlockType.FOCUS
          }
        ];
      } else {
        n.blocks = [
          ...n.blocks,
          {
            start: new Date().getTime(),
            duration: n.currentBlock.duration - n.timeElapsed,
            progress: 0,
            type: BlockType.BREAK
          }
        ];
      }

      let remainingBars = oldBars.slice(n.currentBlock.index + 1);
      n.blocks = n.blocks.concat(remainingBars);
      n.currentBlock.index += 1;
    }
    n = this.updateBlocks(n, BlockType.BREAK);
    n = await this._resumeTimer(n);
    this.modify(n, { isPersist: false });
    return true;
  }
  async resumeSession() {
    let n = this.get();
    n = await this._resumeSession(n);
    this.modify(n, { isPersist: false });
  }
  clearIntervals() {
    this.clearTimers();
  }
  async extendSession() {
    let extendDurationSetting = get(pointronPreferences).extendDuration * 60;
    let n = this.get();
    n.totalExtended = n.totalExtended + extendDurationSetting;
    n.plannedDuration = n.plannedDuration + extendDurationSetting;
    n.currentBlock.duration = n.currentBlock.duration + extendDurationSetting;
    if (!n.plannedDuration) return n;
    n.end = this.resolveEndTime(n);
    let currentLastBar = n.blocks.pop();
    if (currentLastBar) {
      let lastBar = {
        ...currentLastBar,
        duration: n.currentBlock.duration
      };
      n.blocks = [...n.blocks, lastBar];
    }
    if (n.state === SessionState.TIME_IS_UP) {
      await this._resumeTimer(n, { isResetTimer: false });
    }
    this.modify(n, { isPersist: false });
  }
  async startSession() {
    let n = this.get();
    n = this.composeSession(n);
    n = await this._startSession(n);
    //todo - if auto open enabled
    //appEvents.publish(PointronEventEnum.SHOW_ZEN_FOCUS, true);
    appStore.showFullScreenPlayer(PointronAction.FULL_SCREEN_FOCUS);
    // appStore.showMiniPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
    this.modify(n, { isPersist: false });
  }
  async quickStart(goal: {
    id: string;
    label: string;
    color?: number;
    hierarchy?: string[];
  }) {
    let n = this.reset();
    focusItemsStore.reset();
    try {
      n.type = SessionType.COUNTUP;
      n.currentLog = {
        goalId: goal.id,
        taskName: goal.label,
        color: goal.color,
        start: new Date().getTime()
      };
      n.isQuickStartOn = true;
      n.plannedDuration = 0;
      n.composition = {
        type: SessionCompositionType.SLIDER,
        totalDuration: 0,
        focusDuration: 0,
        breakDuration: 0,
        numberOfBreaks: 0,
        breakReminder: get(pointronPreferences).breakReminder ?? 0,
        id: "slider",
        breakType: BreakCompositionType.REMINDER
      };
      n = this.composeSession(n);
      await focusItemsStore.addGoal({
        goalId: goal.id,
        label: goal.label,
        color: goal.color,
        hierarchy: goal.hierarchy,
        worked: 0,
        estimated: 0,
        checked: false,
        order: 0
      });
      n = await this._startSession(n);
      //appStore.showFullScreenPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
      appStore.showMiniPlayer(PointronAction.FOCUS_PLAYER);
    } catch (err) {
      logger.logError(err);
    }
    this.modify(n, { isPersist: false });
  }
  async continueSession() {
    let n = this.get();
    n = await this._continueSession(n);
    this.modify(n, { isPersist: false });
  }
  async onPresetSelection(preset: SessionComposition) {
    let n = this.get();
    n.composition = preset;
    n = this.composeSession(n);
    this.modify(n, { isPersist: false });
    return this.__persist(n);
  }
  async onComposeComplete() {
    let n = this.get();
    if (!n.composition) return;
    n = this.composeSession(n);
    n.preventSliderReverseEventTemp = true;
    this.modify(n, { isPersist: false });
    return this.__persist(n);
  }
  async resetComposition() {
    let n = this.get();
    n.composition = {
      id: generateUID(),
      type: SessionCompositionType.TOTAL_DURATION,
      focusDuration: 0,
      numberOfBreaks: 0,
      breakDuration: 5 * 60,
      totalDuration: 60 * 60,
      breakReminder: 60 * 60,
      breakType: BreakCompositionType.REMINDER
    };
    n = this.composeSession(n);
    this.modify(n, { isPersist: false });
    return this.__persist(n);
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
    n = this.composeSession(n);
    this.modify(n, { isPersist: false });
    // return debouncedPersist(n);
  }
  async saveNotes() {
    let n = this.get();
    this.__persist(n);
  }
}

export const sessionStore = new SessionStore();

export const lastActiveGoalIdForEditing = writable<string | undefined>(
  undefined
);

const seedFocusItemsStore: IFocusItemsStore = {
  items: []
};

class FocusItemsStore extends KeyValueStore<IFocusItemsStore> {
  constructor() {
    super(
      Item.pointSessionFocusItems,
      { ...seedFocusItemsStore },
      {
        priorityRefreshOnAppAppear: true,
        dependencies: [
          { resource: Item.PointGoal, syncType: DependencySyncType.EAGER }
        ]
      }
    );
  }
  //TODO - test loader(), set - whether persisting as expected
  reset() {
    this.modify({ items: [] }, { isPersist: false });
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async addTask(label: string, goalId: string | undefined = undefined) {
    let n = this.get();
    const newTask = {
      label,
      taskId: generateUID(),
      goalId,
      worked: 0,
      estimated: 0,
      checked: false,
      order: n.items.length
    };
    n.items.push(newTask);
    this.modify(n);
    if (goalId) lastActiveGoalIdForEditing.set(goalId);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async addGoal(goal: FocusItem, isPersist: boolean = true) {
    let n = this.get();
    n.items.push({ ...goal });
    this.modify(n, { isPersist });
    lastActiveGoalIdForEditing.set(goal.goalId);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async updateTask(task: FocusItem, isUseDelay: boolean = false) {
    let n = this.get();
    if (n && n.items.length > 0) {
      n.items = n.items.filter((t) => t.taskId != task.taskId);
      n.items.push(task);
    }
    this.modify(n, { isDebouncedPersist: isUseDelay, isPersist: !isUseDelay });
  }
  async updateTaskStatus(id: string, checked: boolean) {
    let n = this.get();
    if (n && n.items.length > 0) {
      n.items = n.items.map((t) => {
        if (t.taskId == id) {
          t.checked = checked;
        }
        return t;
      });
    }
    this.modify(n);
  }
  async updateWorkedTime(id: string, worked: number) {
    let n = this.get();
    if (n && n.items.length > 0) {
      n.items = n.items.map((t) => {
        if (t.taskId == id || t.goalId == id) {
          t.worked = +t.worked + +worked;
        }
        return t;
      });
    }
    this.modify(n);
  }
  async updateOrderValueForTasks(goalId: string, modifiedItems: any) {
    let n = this.get();
    if (n && n.items.length > 0) {
      modifiedItems.forEach((item: any) => {
        let index = n.items.findIndex((i) => i.taskId == item.taskId);
        if (n.items[index].goalId == goalId) n.items[index].order = item.order;
      });
    }
    this.modify(n);
  }
  async updateOrderValueForFI(modifiedItems: any) {
    let n = this.get();
    if (!isValidArrayWithData(modifiedItems)) return;
    modifiedItems.forEach((item: any) => {
      if (item?.taskId) {
        let index = n.items.findIndex((i: any) => i?.taskId == item.taskId);
        n.items[index].order = item.order;
      } else {
        let index = n.items.findIndex((i: any) => i?.goalId == item.goalId);
        n.items[index].order = item.order;
      }
    });
    this.modify(n);
  }
  async deleteTask(id: string) {
    let n = this.get();
    if (n && n.items.length > 0) {
      n.items = n.items.filter((t) => t.taskId != id);
    }
    this.modify(n);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }
  async deleteGoal(id: string) {
    let n = this.get();
    if (n && n.items.length > 0) {
      n.items = n.items.filter((t) => t.goalId != id);
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
