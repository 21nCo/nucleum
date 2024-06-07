import { Item } from "$lib/client/types/item.enum";
import {
  type SessionStore,
  type IntervalBlock,
  BlockType,
  type FocusLog,
  type FocusItem,
  type FocusItemsStore
} from "$lib/client/types/pointron/session.type";
import {
  debouncer,
  generateSessionId,
  generateUID
} from "$lib/client/utils/utils";
import {
  calculateTotalFocusAndBreak,
  generateBarsFromComposition,
  getTotalsFromComposition
} from "$lib/client/components/pointron/local.utils";
import { get, writable } from "svelte/store";
import { FocusPersistance } from "$lib/client/components/pointron/focus/focus.persistance";
import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
import {
  pointronEvents,
  userLocalPreferences
} from "$lib/client/components/pointron/local.store";
import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
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
  fullPageLoadingScreen
} from "$lib/client/stores/notification.store";
import { LaunchContext } from "$lib/client/types/appStore.type";
import { customColor } from "$lib/client/utils/theme.utils";
import { deepCopy, isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { postToParent } from "$lib/client/utils/embed.utils";
import { AlertType } from "$lib/client/types/notification.type";
import { isValidString } from "$lib/client/utils/text.utils";
import {
  DependencySyncType,
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { dataManager } from "$lib/client/stores/data.store";
import { logger } from "$lib/client/stores/log.store";
import appearance from "$lib/client/stores/appearance.store";
import { SessionType } from "$lib/client/components/pointron/logs/log.type";
import { pointLogStore } from "$lib/client/components/pointron/logs/log.store";
import { NodeType } from "$lib/client/types/memotron/node.type";
const focusPersistance = new FocusPersistance();
export const windowClickEvent = writable(null);

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

const sessionStoreId = Item.pointSessionSnapshot;
const seedSessionStore: SessionStore = {
  id: sessionStoreId,
  dataType: StoreDataType.KVO,
  mutatingResources: [Item.PointSession, Item.PointLog],
  priorityRefreshOnAppAppear: true,
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

export const sessionStore = initSessionStore(deepCopy(seedSessionStore));

function initSessionStore(seed: SessionStore) {
  //let timerWorker = new Worker("/timer-worker.ts");
  const { subscribe, set, update } = writable<SessionStore>({ ...seed });
  dataManager.retrieveCache(sessionStoreId).then((m) => {
    if (m) {
      set(m);
    }
  });
  let timer: any;
  let idleTimer: any;
  let composeByEndTimeTimer: any;
  let isIntervalTimeLimitNotified: boolean = false;
  const objectType = Item.SessionStoreV2;
  //appStore.appendPlayer(pointronMiniPlayerPath);
  const propagateMessageToParent = (n: SessionStore) => {
    try {
      const todayFocus = get(todayFocusStore)?.focus;
      const isFocusing = n.currentBlock.type == BlockType.FOCUS;
      const widgetSnapshot = {
        goalName: n.currentLog?.taskName,
        color: customColor(
          get(appearance),
          isFocusing ? "a1" : "a2",
          isFocusing ? n.currentLog.color : undefined
        ),
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
  };

  const persist = async (n: SessionStore | undefined = undefined) => {
    if (!n) n = get(sessionStore);
    n.widgetSnapshot = propagateMessageToParent(n);
    let response = await dataManager.performMutation(
      Item.pointSessionSnapshot,
      n,
      { action: PersistanceActionType.MERGE }
    );
    dataManager.cache(n);
    return response;
  };
  const debouncedPersist = debouncer(persist, 3000);
  const shallowReset = () => {
    clearTimers();
    sessionChangeEvent.set({ id: null });
    appStore.hideFullScreenPlayer(true);
    scheduledNotifications.reset();
  };
  /**
   * Completely resets the session store
   * @returns brand new session store with seed values
   */
  const reset = () => {
    shallowReset();
    modalEvent.hideSpecific(PointronEventEnum.SESSION_FINISHED);
    modalEvent.hideSpecific(PointronEventEnum.BREAK_REMINDER);
    console.log("resetting session store", { seedSessionStore });
    let newSession: SessionStore = deepCopy(seedSessionStore);
    newSession.composition.breakReminder =
      get(userLocalPreferences).breakReminder;
    return newSession;
  };
  const clearTimers = () => {
    clearInterval(timer);
    clearInterval(idleTimer);
  };
  const startSession = async (n: SessionStore) => {
    if (
      get(appStore).launchContext != LaunchContext.EMBED &&
      Notification.permission !== "granted"
    ) {
      Notification.requestPermission();
    }
    console.log("startsession", { n });
    const sessionId = generateSessionId(new Date().getTime());
    n.currentSessionId = sessionId;
    n = updateBlocks(n, BlockType.FOCUS);
    isIntervalTimeLimitNotified = false;
    n.start = new Date();
    n = await resumeTimer(n, { isPersist: false });
    await persist(n);
    sessionChangeEvent.set({ id: sessionId });
    return n;
  };
  const refreshNotifications = (n: SessionStore) => {
    scheduledNotifications.set([]);
    let sessionTimeRemaining: number | undefined = undefined;
    if (n.type != SessionType.COUNTUP) {
      sessionTimeRemaining = n.plannedDuration - n.totalElapsed;
      if (sessionTimeRemaining < 0) clearTimers();
      // if (n.type == SessionType.COUNTDOWN && sessionTimeRemaining < 0) {
      //   n.state = SessionState.TIME_IS_UP;
      //   pointronEvents.notify(PointronEventEnum.SESSION_TIME_IS_UP);
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
            get(userLocalPreferences).breakReminder
          : undefined;
      if (!breakReminderSetting) return;
      timeRemainingToTakeBreak = breakReminderSetting - n.timeElapsed;
      if (timeRemainingToTakeBreak < 0 && !isIntervalTimeLimitNotified) {
        pointronEvents.notify(PointronEventEnum.BREAK_REMINDER);
        isIntervalTimeLimitNotified = true;
      }
    } else if (
      n.type === SessionType.PREDEFINED_INTERVALS &&
      n.state === SessionState.FOCUS_RUNNING
    ) {
      let currentBlock = n.blocks[n.currentBlock.index];
      if (currentBlock?.duration) {
        timeRemainingToTakeBreak = currentBlock.duration - n.timeElapsed;
        if (timeRemainingToTakeBreak < 0 && !isIntervalTimeLimitNotified) {
          pointronEvents.notify(PointronEventEnum.PREDEFINED_INTERVAL_NOTIFIER);
          isIntervalTimeLimitNotified = true;
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
          pointronEvents.notify(PointronEventEnum.PREDEFINED_INTERVAL_NOTIFIER);
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
  };
  /**
   * Resume the session timer and sets everything related to timer including notifications, progress on interval bars, etc.
   * @param n current session store
   * @param options resume options - whether to persist or reset timer
   * @returns updated session store
   */
  const resumeTimer = async (
    n: SessionStore,
    options: { isPersist?: boolean; isResetTimer?: boolean } = {
      isPersist: true,
      isResetTimer: true
    }
  ) => {
    if (options.isResetTimer) n.timeElapsed = 0;
    clearTimers();
    timer = setInterval(() => {
      const currentTime = new Date().getTime();
      n.totalElapsed = (currentTime - n.start!.getTime()) / 1000 - n.totalIdle;
      n.timeElapsed = (currentTime - n.currentBlock.start) / 1000;
      n.timeRemainingToTakeBreak = refreshNotifications(n);
      n.sessionProgress = refreshSessionProgress(n) ?? 0;
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
      const { blocks, isContinueSession } = refreshProgressOnBars(n);
      n.blocks = blocks;
      sessionStore.set(n);
      if (isContinueSession) continueSession(n);
    }, 1000);
    if (options.isPersist) await persist(n);
    return n;
  };
  /**
   * Calculates blocks and total duration of the session based on composition seelction.
   * @param n sessionStore
   * @returns blocks - updated sessionStore
   */
  const composeSession = (n: SessionStore) => {
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
  };
  /**
   * updates start and end time of current and previous blocks along with current log.
   * @param n sessionStore
   * @param type currentBlock type whether focus or break
   * @returns updated sessionStore
   */
  function updateBlocks(n: SessionStore, type: BlockType) {
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
      console.log({ currentBlock, previousBlock });
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
    console.log("updateBlocks", { blocks: deepCopy(n.blocks) });
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
  async function continueSession(n: SessionStore) {
    console.log("continueSession", { n });
    if (n.state == SessionState.FOCUS_RUNNING) {
      pointronEvents.notify(PointronEventEnum.INTERVAL_ENDED);
      n = updateBlocks(n, BlockType.BREAK);
    } else {
      pointronEvents.notify(PointronEventEnum.BREAK_ENDED);
      n = updateBlocks(n, BlockType.FOCUS);
      isIntervalTimeLimitNotified = false;
    }
    n = await resumeTimer(n);
    return n;
  }
  function resolveEndTime(n: SessionStore) {
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
  function refreshSessionProgress(n: SessionStore) {
    if (n.type == SessionType.COUNTUP) return 100;
    if (!n.start || !n.end) return;
    return (
      (n.totalElapsed / ((n.end?.getTime() - n.start?.getTime()) / 1000)) * 100
    );
  }
  function runIdleTimer(n: SessionStore) {
    // if (n.currentIdle) {
    //   idleTimer = setInterval(() => {
    //     n.totalIdle += 1;
    //     sessionStore.set(n);
    //   }, 1000);
    // }
  }
  function startIdleTime(n: SessionStore) {
    clearTimers();
    n.currentIdle = new Date().getTime();
    runIdleTimer(n);
    return n;
  }
  function clearIdle(n: SessionStore) {
    let now = new Date().getTime();
    n.totalIdle += (now - n.currentIdle) / 1000;
    n.currentIdle = 0;
    if (idleTimer) clearInterval(idleTimer);
    return n;
  }
  function refreshProgressOnBars(n: SessionStore): {
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
      console.log("refreshProgressOnBars", {
        barDuration,
        totalElapsedRemaining
      });
      if (barDuration == totalElapsedRemaining) {
        refreshedProgress = 1;
        totalElapsedRemaining = 0;
        //todo - fix this - creating infinite loop
        clearTimers();
        if (n.currentBlock.index == n.blocks.length - 1) {
          sessionStore.finishSession();
        } else if (get(userLocalPreferences).isEnableAutoStartInterval) {
          n.currentBlock.index += 1;
          isContinueSession = true;
        } else {
          n.state =
            n.state === SessionState.FOCUS_RUNNING
              ? SessionState.FOCUS_COMPLETED
              : SessionState.BREAK_COMPLETED;
          n.currentBlock.index += 1;
          if (n.state === SessionState.FOCUS_COMPLETED) {
            pointronEvents.notify(PointronEventEnum.INTERVAL_ENDED);
          } else if (n.state === SessionState.BREAK_COMPLETED) {
            pointronEvents.notify(PointronEventEnum.BREAK_ENDED);
          }
          startIdleTime(n);
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
      sessionStore.finishSession();
    }
    return { blocks: newBars, isContinueSession };
  }
  async function resumeSession(n: SessionStore) {
    if (n.state === SessionState.FOCUS_RUNNING) return n;
    if (n.state === SessionState.BREAK_COMPLETED) {
      n = clearIdle(n);
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
    n = updateBlocks(n, BlockType.FOCUS);
    isIntervalTimeLimitNotified = false;
    n = await resumeTimer(n);
    return n;
  }
  async function stopCurrentTaskOrGoal(
    n: SessionStore,
    isSessionFinish: boolean = false
  ) {
    console.log("stopCurrentTaskOrGoal", { n });
    if (n.isQuickStartOn) n.isQuickStartOn = false;
    let end = new Date().getTime();
    let lastBlock = n.currentLog?.blocks?.pop();
    if (lastBlock) {
      lastBlock.end = end;
      n.currentLog.blocks = [...(n.currentLog?.blocks ?? []), lastBlock];
    }
    if ((n.currentLog.taskId || n.currentLog.goalId) && n.blocks) {
      let duration = calculateTotalFocusAndBreak(n.currentLog.blocks);
      console.log("stopCurrentTaskOrGoal", {
        duration,
        currentLog: n.currentLog
      });
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
  async function closeSession(isPersist: boolean = true) {
    //TODO - resetSession - via - dataManager.performMutation
    let result = undefined;
    if (isPersist) result = await focusPersistance.resetSession();
    if (result?.todayFocus)
      todayFocusStore.set({
        focus: result.todayFocus,
        streak: result.streak
      });
    focusItemsStore.reset();
    let n = reset();
    set(n);
    dataManager.cache(n);
    pointronEvents.notify(PointronEventEnum.SESSION_CLOSED);
    return (isPersist && result) || n;
  }
  return {
    subscribe,
    set: (m: SessionStore) => {
      set(m);
    },
    update,
    close: closeSession,
    // reload: () => {
    //   let saved = retrieve();
    //   set(saved);
    // },
    loader: async (savedSessionStore: SessionStore) => {
      logger.log({ context: "session store loader", savedSessionStore });
      console.log({ context: "session store loader", savedSessionStore });
      savedSessionStore = { ...savedSessionStore, id: sessionStoreId };
      if (
        savedSessionStore.start &&
        typeof savedSessionStore.start == "string"
      ) {
        savedSessionStore.start = new Date(savedSessionStore.start);
      }
      if (savedSessionStore.end && typeof savedSessionStore.end == "string") {
        savedSessionStore.end = new Date(savedSessionStore.end);
      }
      if (
        savedSessionStore.currentSessionId &&
        savedSessionStore.isSessionRunning
      ) {
        modalEvent.hideSpecific(PointronEventEnum.SESSION_FINISHED);
        appStore.showMiniPlayer(PointronEventEnum.FOCUS_PLAYER);
        savedSessionStore = await resumeTimer(savedSessionStore, {
          isPersist: false,
          isResetTimer: false
        });
      } else if (savedSessionStore.state === SessionState.FINISHED) {
        shallowReset();
        appStore.runAction(PointronEventEnum.SESSION_FINISHED);
        set(savedSessionStore);
      } else {
        focusItemsStore.reset();
        savedSessionStore = reset();
        set(savedSessionStore);
        dataManager.cache(savedSessionStore);
      }
      propagateMessageToParent(savedSessionStore);
    },
    loadEmptyState: () => {
      console.log("loadEmptyState");
      set(reset());
      propagateMessageToParent(get(sessionStore));
    },
    finishSession: async (isClose: boolean = false) => {
      let n = get(sessionStore);
      if (!n.isQuickStartOn) fullPageLoadingScreen.show("Finishing session...");
      try {
        const now = new Date().getTime();
        if (!n.currentLog.end) n.currentLog.end = now;
        if (n.currentLog.start != 0) await stopCurrentTaskOrGoal(n, true);
        let lastBlock = n.blocks?.pop();
        if (lastBlock) {
          lastBlock.end = now;
          n.blocks = [...(n.blocks ?? []), lastBlock];
        }
        // n.blocks = [...n.blocks, { start: now, duration: 0, progress: 1 }];
        n.state = SessionState.FINISHED;
        n.isSessionRunning = false;
        pointLogStore.finishFocus(n, get(focusItemsStore), isClose);
      } catch (err) {
        logger.logError(err);
      } finally {
        if (isClose) {
          closeSession(false);
        } else {
          shallowReset();
          propagateMessageToParent(n);
          update(() => {
            return n;
          });
          pointronEvents.notify(PointronEventEnum.SESSION_FINISHED);
        }
        fullPageLoadingScreen.hide();
      }
      return n;
    },
    // deleteSession: () => {
    //   update((n: SessionStore) => {
    //     if (n.currentSessionId || n.previousSessionId) {
    //       persistance.delete(
    //         n.currentSessionId ?? n.previousSessionId ?? "",
    //         Item.PointSession
    //       );
    //     }
    //     const newValue = reset();
    //     persist(newValue);
    //     return newValue;
    //   });
    // },
    startTask: async (
      id: string,
      taskName: string,
      color: number | undefined,
      goalId: string | undefined = undefined
    ) => {
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
      let n = get(sessionStore);
      if (n.currentLog.start != 0) await stopCurrentTaskOrGoal(n);
      n.currentLog = newLog;
      if (n.state === SessionState.BREAK_RUNNING) {
        n = await resumeSession(n);
      } else {
        persist(n);
      }
      set(n);
    },
    startGoal: async (
      id: string,
      goalName: string,
      color: number | undefined
    ) => {
      let n = get(sessionStore);
      if (n.currentLog.start != 0) await stopCurrentTaskOrGoal(n);
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
        n = await resumeSession(n);
      } else {
        persist(n);
      }
      set(n);
    },
    stopCurrentTaskOrGoal: async () => {
      let n = get(sessionStore);
      const newValue = await stopCurrentTaskOrGoal(n);
      console.log("stopCurrentTaskOrGoal", { newValue: deepCopy(newValue) });
      set(newValue);
      return persist(newValue);
    },
    resumeTimer: async (isResetTimer: boolean = true) => {
      let n = get(sessionStore);
      n = await resumeTimer(n, { isResetTimer });
      update(() => {
        return n;
      });
    },
    startBreak: async () => {
      let n = get(sessionStore);
      if (n.state === SessionState.BREAK_RUNNING) return false;
      if (n.state === SessionState.FOCUS_COMPLETED) {
        n = clearIdle(n);
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
      n = updateBlocks(n, BlockType.BREAK);
      n = await resumeTimer(n);
      set(n);
      return true;
    },
    resumeSession: async () => {
      let n = get(sessionStore);
      n = await resumeSession(n);
      set(n);
    },
    clearIntervals: () => {
      update((n: SessionStore) => {
        clearTimers();
        return n;
      });
    },
    extendSession: async () => {
      let extendDurationSetting = get(userLocalPreferences).extendDuration * 60;
      let n = get(sessionStore);
      n.totalExtended = n.totalExtended + extendDurationSetting;
      n.plannedDuration = n.plannedDuration + extendDurationSetting;
      n.currentBlock.duration = n.currentBlock.duration + extendDurationSetting;
      if (!n.plannedDuration) return n;
      n.end = resolveEndTime(n);
      let currentLastBar = n.blocks.pop();
      if (currentLastBar) {
        let lastBar = {
          ...currentLastBar,
          duration: n.currentBlock.duration
        };
        n.blocks = [...n.blocks, lastBar];
      }
      if (n.state === SessionState.TIME_IS_UP) {
        await resumeTimer(n, { isResetTimer: false });
      }
      set(n);
    },
    startSession: async () => {
      let n = get(sessionStore);
      n = composeSession(n);
      n = await startSession(n);
      //todo - if auto open enabled
      //pointronEvents.notify(PointronEventEnum.SHOW_ZEN_FOCUS, true);
      appStore.showFullScreenPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
      // appStore.showMiniPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
      set(n);
    },
    quickStart: async (
      goalId: string,
      goalLabel: string,
      color: number | undefined
    ) => {
      let n = reset();
      focusItemsStore.reset();
      try {
        n.type = SessionType.COUNTUP;
        n.currentLog = {
          goalId,
          taskName: goalLabel,
          color,
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
          breakReminder: get(userLocalPreferences).breakReminder ?? 0,
          id: "slider",
          breakType: BreakCompositionType.REMINDER
        };
        n = composeSession(n);
        await focusItemsStore.addGoal({
          goalId,
          label: goalLabel,
          color,
          worked: 0,
          estimated: 0,
          checked: false,
          order: 0
        });
        n = await startSession(n);
        //appStore.showFullScreenPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
        appStore.showMiniPlayer(PointronEventEnum.FOCUS_PLAYER);
      } catch (err) {
        logger.logError(err);
      }
      set(n);
    },
    continueSession: async () => {
      let n = get(sessionStore);
      n = await continueSession(n);
      set(n);
    },
    onPresetSelection: async (preset: SessionComposition) => {
      let n = get(sessionStore);
      n.composition = preset;
      n = composeSession(n);
      set(n);
      return persist(n);
    },
    onComposeComplete: async () => {
      let n = get(sessionStore);
      if (!n.composition) return;
      console.log("onCompose", { n, type: n.composition.type });
      n = composeSession(n);
      n.preventSliderReverseEventTemp = true;
      set(n);
      return persist(n);
    },
    resetComposition: async () => {
      let n = get(sessionStore);
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
      n = composeSession(n);
      set(n);
      return persist(n);
    },
    saveCurrentCompositionAsPreset: async () => {
      let n = get(sessionStore);
      if (!n.composition) return;
      const name = get(newPresetLabel);
      return userLocalPreferences.addPreset({
        ...n.composition,
        name,
        id: generateUID()
      });
    },
    onSliderDurationChange: async (duration: number) => {
      let n = get(sessionStore);
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
      n = composeSession(n);
      set(n);
      return debouncedPersist(n);
    },
    persist: (isUseDelay: boolean) => {
      let n = get(sessionStore);
      if (isUseDelay) debouncedPersist(n);
      else persist(n);
    }
  };
}

const seedTask = {
  label: "",
  goalId: "",
  worked: 0,
  estimated: 0,
  checked: false,
  order: 0
};

export const lastActiveGoalIdForEditing = writable<string | undefined>(
  undefined
);

const focusItemsStoreId = Item.pointSessionFocusItems;
const seedFocusItemsStore: FocusItemsStore = {
  id: focusItemsStoreId,
  dataType: StoreDataType.KVO,
  priorityRefreshOnAppAppear: true,
  items: [],
  dependencies: [
    { resource: Item.PointGoal, syncType: DependencySyncType.EAGER }
  ]
};

export const focusItemsStore = initFocusItemsStore();

function initFocusItemsStore() {
  const { subscribe, set, update } = writable<FocusItemsStore>(
    deepCopy(seedFocusItemsStore)
  );
  dataManager.retrieveCache(focusItemsStoreId).then((m) => {
    if (m) {
      set({ ...seedFocusItemsStore, items: m.items, id: focusItemsStoreId });
    }
  });
  const persist = async (store: FocusItemsStore) => {
    console.log("focusItemsStore.persist", { store });
    if (!store) store = get(focusItemsStore);
    //TODO - check where the id is being set to kv: prefix other than loader or in loader
    const val = { ...store, id: focusItemsStoreId };
    let response = await dataManager.performMutation(
      Item.pointSessionFocusItems,
      val,
      { action: PersistanceActionType.MERGE }
    );
    dataManager.cache(val);
    return response;
  };
  const debouncedPersist = debouncer(persist, 3000);

  return {
    subscribe,
    update,
    set: async (m: FocusItemsStore) => {
      set(m);
      persist(m);
    },
    loader: (m: FocusItemsStore) => {
      logger.log({ context: "focusItemsStore.loader", m });
      console.log({ context: "focusItemsStore.loader", m });
      if (m && m.items?.length > 0) {
        const store = {
          ...seedFocusItemsStore,
          items: m.items,
          id: focusItemsStoreId
        };
        console.log("focusItemsStore.loader", { store });
        set(store);
        dataManager.cache(store);
      }
    },
    reset: () => {
      const store = deepCopy(seedFocusItemsStore);
      console.log("reset focus items", { store });
      set(store);
      dataManager.cache(store);
      pointronEvents.notify(PointronEventEnum.REFRESH_FOCUSITEMS);
    },
    addTask: async (label: string, goalId: string | undefined = undefined) => {
      let n = get(focusItemsStore);
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
      set(n);
      if (goalId) lastActiveGoalIdForEditing.set(goalId);
      pointronEvents.notify(PointronEventEnum.REFRESH_FOCUSITEMS);
      persist(n);
    },
    addGoal: async (goal: FocusItem, isPersist: boolean = true) => {
      update((n: FocusItemsStore) => {
        n.items.push({ ...goal });
        console.log("addGoal", { goal, n });
        if (isPersist) persist(n);
        return n;
      });
      lastActiveGoalIdForEditing.set(goal.goalId);
      pointronEvents.notify(PointronEventEnum.REFRESH_FOCUSITEMS);
    },
    updateTask: async (task: FocusItem, isUseDelay: boolean = false) => {
      update((n: FocusItemsStore) => {
        if (n && n.items.length > 0) {
          n.items = n.items.filter((t) => t.taskId != task.taskId);
          n.items.push(task);
        }
        if (isUseDelay) debouncedPersist();
        else persist(n);
        return n;
      });
    },
    updateTaskStatus: async (id: string, checked: boolean) => {
      update((n: FocusItemsStore) => {
        if (n && n.items.length > 0) {
          n.items = n.items.map((t) => {
            if (t.taskId == id) {
              t.checked = checked;
            }
            return t;
          });
        }
        persist(n);
        return n;
      });
    },
    updateWorkedTime: async (id: string, worked: number) => {
      update((n: FocusItemsStore) => {
        if (n && n.items.length > 0) {
          n.items = n.items.map((t) => {
            if (t.taskId == id || t.goalId == id) {
              t.worked = +t.worked + +worked;
            }
            return t;
          });
        }
        persist(n);
        return n;
      });
    },
    updateOrderValueForTasks: async (goalId: string, modifiedItems: any) => {
      update((n: FocusItemsStore) => {
        if (n && n.items.length > 0) {
          modifiedItems.forEach((item: any) => {
            let index = n.items.findIndex((i) => i.taskId == item.taskId);
            if (n.items[index].goalId == goalId)
              n.items[index].order = item.order;
          });
        }
        persist(n);
        return n;
      });
    },
    updateOrderValueForFI: async (modifiedItems: any) => {
      update((n: FocusItemsStore) => {
        if (!isValidArrayWithData(modifiedItems)) return n;
        modifiedItems.forEach((item: any) => {
          if (item?.taskId) {
            let index = n.items.findIndex((i: any) => i?.taskId == item.taskId);
            n.items[index].order = item.order;
          } else {
            let index = n.items.findIndex((i: any) => i?.goalId == item.goalId);
            n.items[index].order = item.order;
          }
        });
        persist(n);
        return n;
      });
    },
    // updateCurrentTasks: async (tasks: FocusItemType[]) => {
    //   update(() => {
    //     return tasks;
    //   });
    //   return persist();
    // },
    deleteTask: async (id: string) => {
      let n = get(focusItemsStore);
      if (n && n.items.length > 0) {
        n.items = n.items.filter((t) => t.taskId != id);
      }
      set(n);
      persist(n);
      pointronEvents.notify(PointronEventEnum.REFRESH_FOCUSITEMS);
    },
    deleteGoal: async (id: string) => {
      let n = get(focusItemsStore);
      if (n && n.items.length > 0) {
        n.items = n.items.filter((t) => t.goalId != id);
      }
      set(n);
      persist(n);
      pointronEvents.notify(PointronEventEnum.REFRESH_FOCUSITEMS);
    },
    propagateDependencyChanges: (data: any) => {
      logger.log({
        context: "propagateDependencyChanges to focusItemsStore",
        data
      });
      //TODO - check if any existing task or goal is dependent on this change - change of label for a goal or color etc
    }
  };
}
