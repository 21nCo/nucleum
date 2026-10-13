import {
  type IActiveSessionStore,
  BlockType
} from "@nucleum/features/focus/session.type";
import { get } from "svelte/store";
import { SessionState } from "@nucleum/features/focus/sessionState.enum";
import { pointronPreferences } from "@nucleum/features/focus/preferences.store";
import { BreakCompositionType } from "@nucleum/features/focus/sessionComposition.type";
import { appEvents } from "@nucleum/shared-state/events/app-events.store";
import { scheduledNotifications } from "./scheduled-notifications.store";
import { SessionType } from "@nucleum/features/focus/logs/log.type";
import { PointronEvent } from "@nucleum/shared-state/events/focus-event.enum";
import { postDataToParent } from "@nucleum/client/runtime/embed/embed.utils";
import { EmbedDataMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";

/** Schedules notifications from a session snapshot and reports reminder changes. */
export function refreshSessionNotifications(
  session: IActiveSessionStore,
  onBreakReminderChange: (isNotified: boolean) => void
) {
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
    const isBreakReminderNotified = scheduleBreakReminderNotification(
      session.isBreakReminderNotified === true
    );
    if (isBreakReminderNotified !== session.isBreakReminderNotified) {
      onBreakReminderChange(isBreakReminderNotified);
    }
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
  }
}

/** Publishes scheduled notifications through the native embed transport. */
export function publishSessionNotifications() {
  const notifications = get(scheduledNotifications);
  postDataToParent(EmbedDataMessage.NOTIFICATIONS, notifications);
}
