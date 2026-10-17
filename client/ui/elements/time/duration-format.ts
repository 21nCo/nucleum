import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
import { Size } from "@21n/ui/elements/size.enum";

/** Format seconds. */
export function formatSeconds(
  seconds: number,
  format: TimeFormat = TimeFormat.VERBOSE,
  params?: {
    isAlwaysShowSecs?: boolean;
    verboseTextSize?: Size.sm | Size.md | Size.lg;
  }
) {
  const numericSeconds =
    typeof seconds === "number" ? seconds : Number(seconds);
  const safeSeconds = Number.isFinite(numericSeconds) ? numericSeconds : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  if (format === TimeFormat.VERBOSE) {
    const size = params?.verboseTextSize ?? Size.sm;
    const minutesLabel =
      size === Size.sm
        ? "m"
        : size === Size.md
          ? "min"
          : minutes > 1
            ? "minutes"
            : "minute";
    const secondsLabel =
      size === Size.sm
        ? "s"
        : size === Size.md
          ? "sec"
          : secs > 1
            ? "seconds"
            : "second";
    const hoursLabel =
      size === Size.sm
        ? "h"
        : size === Size.md
          ? "hr"
          : hours > 1
            ? "hours"
            : "hour";
    if (hours > 0) {
      return (
        `${hours} ${hoursLabel}` +
        (minutes > 0 ? ` ${minutes} ${minutesLabel}` : "") +
        (+secs > 0 && params?.isAlwaysShowSecs
          ? ` ${secs} ${secondsLabel}`
          : "")
      );
    } else if (minutes > 0) {
      return (
        `${minutes} ${minutesLabel}` +
        (+secs > 0 ? ` ${secs} ${secondsLabel}` : "")
      );
    } else return `${secs} ${secondsLabel}`;
  } else if (format === TimeFormat.CLOCK) {
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const ss = secs.toString().padStart(2, "0");
    if (hours > 0) return `${hh}:${mm}:${ss}`;
    else return `${mm}:${ss}`;
  } else if (format === TimeFormat.DECIMALS) {
    if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${secs}s`;
    }
  }
}

/** Format seconds to time in decimals. */
export function formatSecondsToTimeInDecimals(
  seconds: number,
  toFixed: number = 2,
  scale: string = "hrs",
  isShowUnits: boolean = true
) {
  if (scale === "hrs") {
    return `${(seconds / (60 * 60)).toFixed(toFixed)} ${isShowUnits ? "hr" : ""}`;
  } else if (scale === "min") {
    return `${(seconds / 60).toFixed(toFixed)} ${isShowUnits ? "m" : ""}`;
  }
}

/** Get time label. */
export function getTimeLabel(time: number) {
  const hours = Math.floor(time / 60);
  const minutes = Math.floor(time % 60);
  const seconds = Math.floor((time * 60) % 60);

  const hoursLabel = hours > 1 ? "hrs" : "hr";
  const minutesLabel = minutes > 1 ? "mins" : "min";
  const secondsLabel = seconds > 1 ? "secs" : "sec";

  if (hours > 0) {
    if (minutes === 0) return `${hours} ${hoursLabel}`;
    else return `${hours} ${hoursLabel} ${minutes} ${minutesLabel}`;
  }
  if (minutes > 0) {
    if (minutes < 10 && seconds > 0)
      return `${minutes} ${minutesLabel} ${seconds} ${secondsLabel}`;
    return `${minutes} ${minutesLabel}`;
  }
  return `${seconds} ${secondsLabel}`;
}
