import {
  TimePeriodType,
  type TimePeriod,
  TimeScale,
  TimeFormat
} from "$lib/client/types/time.type";
import moment from "moment-timezone";
import type { UserDate } from "$lib/client/types/userDate.type";
import type { IUserGlobalPreferences } from "$lib/client/types/preferences.type";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const locale = navigator.language || navigator.languages[0];
export function formatTime(
  userPreferences: IUserGlobalPreferences,
  date: Date,
  format: string | undefined = undefined
) {
  let userPreferredFormat = userPreferences.timeFormat;
  format = format ?? userPreferredFormat ?? "meridian";
  if (format === "24") {
    let hours = date?.getHours().toString().padStart(2, "0");
    let minutes = date?.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } else if (format === "meridian") {
    let hours = date?.getHours();
    let minutes = date?.getMinutes().toString().padStart(2, "0");
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
}

export function formatSeconds(
  seconds: number,
  format: TimeFormat = TimeFormat.VERBOSE,
  isAlwaysShowSecs: boolean = false
) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (format === TimeFormat.VERBOSE) {
    if (hours > 0)
      return (
        `${hours}h` +
        (minutes > 0 ? ` ${minutes}m` : "") +
        (+secs > 0 && isAlwaysShowSecs ? ` ${secs}s` : "")
      );
    else if (minutes > 0) return `${minutes}m` + (+secs > 0 ? ` ${secs}s` : "");
    else return `${secs}s`;
  } else if (format === TimeFormat.CLOCK) {
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const ss = secs.toString().padStart(2, "0");
    if (hours > 0) return `${hh}:${mm}:${ss}`;
    else return `${mm}:${ss}`;
  }
}

export function formatSecondsToTimeInDecimals(
  seconds: number,
  toFixed: number = 2,
  scale: string = "hrs",
  isShowUnits: boolean = true
) {
  if (scale === "hrs") {
    return `${(seconds / (60 * 60)).toFixed(toFixed)} ${
      isShowUnits ? "hr" : ""
    }`;
  } else if (scale === "min") {
    return `${(seconds / 60).toFixed(toFixed)} ${isShowUnits ? "m" : ""}`;
  }
}

export function timePeriodLabel(period: TimePeriod) {
  const { scale, value } = period;
  if (typeof value.param != "number") return;
  if (
    value.type === TimePeriodType.RELATIVE ||
    value.type === TimePeriodType.UPPER_RELATIVE
  ) {
    if (value.param === 0) {
      if (scale === TimeScale.DAYS && value.type === TimePeriodType.RELATIVE)
        return "Today";
      else if (value.type === TimePeriodType.UPPER_RELATIVE) {
        if (scale === TimeScale.DAYS) return "This Month";
        else if (scale === TimeScale.MONTHS) return "This Year";
      } else return `This ${scale.slice(0, scale.length - 1).toLowerCase()}`;
    } else if (value.param === 1) {
      if (scale === TimeScale.DAYS && value.type === TimePeriodType.RELATIVE)
        return "Tomorrow";
      else return `Next ${scale.toLowerCase()}`;
    } else if (value.param === -1) {
      if (scale === TimeScale.DAYS && value.type === TimePeriodType.RELATIVE)
        return "Yesterday";
      else if (value.type === TimePeriodType.UPPER_RELATIVE) {
        if (scale === TimeScale.DAYS) return "Last Month";
        else if (scale === TimeScale.MONTHS) return "Last Year";
      } else return `Last ${scale.toLowerCase().slice(0, scale.length - 1)}`;
    } else if (value.param < 0) {
      return `Last ${Math.abs(value.param)} ${scale.toLowerCase()}`;
    } else if (value.param > 0) {
      return `Next ${value} ${scale.toLowerCase()}`;
    }
  }
}

export function determinePreviousTimePeriod(period: TimePeriod) {
  const val = determineTimePeriodv2(period);
  let previous = val.begin;
  switch (period.scale) {
    case TimeScale.DAYS:
      const numberOfDays = Math.floor(
        (val.end.getTime() - val.begin.getTime()) / (1000 * 60 * 60 * 24)
      );
      previous.setDate(val.begin.getDate() - numberOfDays);
      break;
    case TimeScale.MONTHS:
      const numberOfMonths = Math.floor(
        (val.end.getTime() - val.begin.getTime()) / (1000 * 60 * 60 * 24) / 30
      );
      previous.setMonth(val.begin.getMonth() - numberOfMonths);
      break;
    case TimeScale.YEARS:
      const numberOfYears = Math.floor(
        (val.end.getTime() - val.begin.getTime()) / (1000 * 60 * 60 * 24) / 365
      );
      break;
  }
  return previous;
}

/**
 * @deprecated - Use {@link determineTimePeriodv2} instead
 * @param period
 * @returns
 */
export function determineTimePeriod(period: TimePeriod) {
  let begin = new Date();
  let end = new Date();
  let title;
  if (
    period.value.type === TimePeriodType.ABSOLUTE &&
    period.value instanceof Object &&
    "start" in period.value &&
    "end" in period.value
  ) {
    begin = period.value.param.start;
    end = period.value.param.end;
    return { begin, end, title: "" };
  }
  if (period.scale === TimeScale.DAYS) {
    if (
      period.value.type === TimePeriodType.RELATIVE &&
      typeof period.value.param === "number"
    ) {
      begin.setDate(begin.getDate() + period.value.param);
      title = timePeriodLabel(period);
      if (period.value.param === -1) {
        end.setDate(end.getDate() - 1);
      }
    } else if (
      period.value.type === TimePeriodType.CALENDAR_BOUND &&
      period.value instanceof Array
    ) {
      const year = period.value[0];
      const month = period.value[1];
      begin.setFullYear(year);
      begin.setMonth(month);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(month);
      end.setDate(31);
      title = `Days of ${months[month]} ${year}`;
    }
  } else if (period.scale === TimeScale.MONTHS) {
    if (
      period.value.type === TimePeriodType.RELATIVE &&
      typeof period.value.param === "number"
    ) {
      begin.setMonth(begin.getMonth() + period.value.param);
      title = timePeriodLabel(period);
      if (period.value.param === -1) {
        end.setMonth(end.getMonth() - 1);
      }
      begin.setDate(1);
      end.setDate(31);
    } else if (
      period.value.type === TimePeriodType.CALENDAR_BOUND &&
      period.value instanceof Array
    ) {
      const year = period.value[0];
      begin.setFullYear(year);
      begin.setMonth(0);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(11);
      end.setDate(31);
      title = `Months of ${year}`;
    }
  } else if (period.scale === TimeScale.YEARS) {
    if (
      period.value.type === TimePeriodType.RELATIVE &&
      typeof period.value.param === "number"
    ) {
      begin.setFullYear(begin.getFullYear() + period.value.param);
      title = timePeriodLabel(period);
      if (period.value.param === -1) {
        end.setFullYear(end.getFullYear() - 1);
      }
      begin.setDate(1);
      end.setDate(31);
      begin.setMonth(0);
      end.setMonth(11);
    } else if (
      period.value.type === TimePeriodType.CALENDAR_BOUND &&
      period.value instanceof Array
    ) {
      const year = period.value[0];
      begin.setFullYear(year);
      begin.setMonth(0);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(11);
      end.setDate(31);
      title = `Year ${year}`;
    }
  }
  begin.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { begin, end, title };
}

export function determineTimePeriodv2(period: TimePeriod) {
  let begin = new Date();
  let end = new Date();
  let title = timePeriodLabel(period);
  if (
    period.value.type === TimePeriodType.ABSOLUTE &&
    period.value instanceof Object &&
    "start" in period.value &&
    "end" in period.value
  ) {
    begin = period.value.param.start;
    end = period.value.param.end;
    return { begin, end, title: "" };
  }
  if (
    period.scale === TimeScale.DAYS &&
    period.value.type === TimePeriodType.RELATIVE &&
    typeof period.value.param === "number"
  ) {
    begin.setDate(begin.getDate() + period.value.param);
    if (period.value.param === -1) {
      end.setDate(end.getDate() - 1);
    }
  } else if (
    ((period.scale === TimeScale.MONTHS &&
      period.value.type === TimePeriodType.RELATIVE) ||
      (period.scale === TimeScale.DAYS &&
        period.value.type === TimePeriodType.UPPER_RELATIVE)) &&
    typeof period.value.param === "number"
  ) {
    begin.setMonth(begin.getMonth() + period.value.param);
    if (period.value.param === -1) {
      end.setMonth(end.getMonth() - 1);
    }
    begin.setDate(1);
    end.setDate(31);
  } else if (
    ((period.scale === TimeScale.YEARS &&
      period.value.type === TimePeriodType.RELATIVE) ||
      (period.scale === TimeScale.MONTHS &&
        period.value.type === TimePeriodType.UPPER_RELATIVE)) &&
    typeof period.value.param === "number"
  ) {
    begin.setFullYear(begin.getFullYear() + period.value.param);
    if (period.value.param === -1) {
      end.setFullYear(end.getFullYear() - 1);
    }
    begin.setDate(1);
    end.setDate(31);
    begin.setMonth(0);
    end.setMonth(11);
  }
  begin.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { begin, end, title };
}

export function getCorrespoingHorizonFrequencyLabel(scale: TimeScale) {
  switch (scale) {
    case TimeScale.DAYS:
      return "Daily";
    case TimeScale.WEEKS:
      return "Weekly";
    case TimeScale.MONTHS:
      return "Monthly";
    case TimeScale.QUARTERS:
      return "Quarterly";
    case TimeScale.YEARS:
      return "Yearly";
  }
}

/**
 * Returns an array of time zones with offsets.
 * @returns Array of time zones with offsets
 */
export const getTimeZonesWithOffsets = () => {
  const zones = moment.tz.names();
  return zones.map((zone) => {
    const offset = moment.tz(zone).utcOffset();
    const formattedOffset =
      (offset >= 0 ? "+" : "-") +
      String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0") +
      ":" +
      String(Math.abs(offset) % 60).padStart(2, "0");
    return {
      label: zone + " (UTC" + formattedOffset + ")",
      offset,
      zone
    };
  });
};

/**
 * Detects the time zone of the user.
 * @returns The time zone of the user.
 */
export function detectTimeZone() {
  const timeZones = getTimeZonesWithOffsets();
  try {
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZone = timeZones.find((x: any) => x.zone === detectedTimeZone);
    return timeZone;
  } catch (error) {
    console.error("Could not detect time zone:", error);
  }
}

//todo cleanup - this is duplicate of formatSeconds
export function getTimeLabel(time: number) {
  //time in minutes
  const hours = Math.floor(time / 60);
  const minutes = Math.floor(time % 60);
  const seconds = Math.floor((time * 60) % 60);

  const hoursLabel = hours > 1 ? "hrs" : "hr";
  const minutesLabel = minutes > 1 ? "mins" : "min";
  const secondsLabel = seconds > 1 ? "secs" : "sec";

  if (hours > 0) {
    //When more than 60 minutes (at least 1 hour)
    if (minutes === 0) return `${hours} ${hoursLabel}`;
    else return `${hours} ${hoursLabel} ${minutes} ${minutesLabel}`;
  }
  if (minutes > 0) {
    //When between 1 and 60 minutes and hour is 0
    if (minutes < 10 && seconds > 0)
      //When minutes is less than 10 then we want to show seconds as well
      return `${minutes} ${minutesLabel} ${seconds} ${secondsLabel}`;
    return `${minutes} ${minutesLabel}`;
  }
  return `${seconds} ${secondsLabel}`;
}

export function formatUserDate(
  date: UserDate,
  format: string = "verbose"
): string {
  const dd = date.day.toString().padStart(2, "0");
  const mm = (date.month + 1).toString().padStart(2, "0");
  const yy = String(date.year); //.slice(-2);
  if (format === "yyyy:mm:dd") {
    return `${yy}-${mm}-${dd}`;
  } else if (format === "verbose") {
    return `${dd} ${months[date.month]} ${yy}`;
  }
  return `${yy}-${mm}-${dd}`;
}

export function formatDateRelativeToToday(date: UserDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.year, date.month, date.day);

  const dayDifference = Math.round(
    (+inputDate - +today) / (1000 * 60 * 60 * 24)
  );
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  if (dayDifference === 0) {
    return "Today";
  } else if (dayDifference === -1) {
    return "Yesterday";
  } else if (dayDifference <= -2 && dayDifference >= -6) {
    return `Last ${dayNames[inputDate.getDay()]}`;
  } else {
    return formatUserDate(date);
  }
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//generate doc string
/**
 * Increments a date time by a number of hours
 * @param dateTime - date time to increment
 * @param numberOfHours - number of hours to increment by
 * @param isRoundToNearestHour - round to nearest hour
 * @returns
 */
export function incrementTime(
  dateTime: Date,
  numberOfHours: number,
  isRoundToNearestHour: boolean = false
) {
  if (isRoundToNearestHour) {
    const minutes = dateTime.getMinutes();
    const minutesRounded = Math.round(minutes / 60) * 60;
    dateTime.setMinutes(minutesRounded);
  }
  return new Date(dateTime.getTime() + numberOfHours * 60 * 60 * 1000);
}

export function formatDate(
  date: Date,
  format:
    | "iso"
    | "iso-short"
    | "verbose"
    | "mm-dd"
    | "mmm-dd"
    | "mmm-yy" = "verbose"
) {
  if (format === "iso" || format === "iso-short") {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, "0");
    let day = date.getDate().toString().padStart(2, "0");
    if (format === "iso") return `${year}-${month}-${day}T00:00:00.000Z`;
    else return `${year}-${month}-${day}`;
  } else if (format === "verbose") {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  } else if (format === "mmm-dd") {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "2-digit"
    });
  } else if (format === "mm-dd") {
    return date.toLocaleDateString(locale, {
      month: "2-digit",
      day: "2-digit"
    });
  } else if (format === "mmm-yy") {
    return date.toLocaleDateString(locale, {
      month: "short",
      year: "2-digit"
    });
  }
}

export function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function offsetDate(date: Date, offset: number) {
  return new Date(date.getTime() + offset * 24 * 60 * 60 * 1000);
}

/**
 * Attaches time to a date - time is in format HH:MM
 * @param date
 * @param time
 * @returns
 */
export function attachTimeToDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":");
  date.setHours(parseInt(hours));
  date.setMinutes(parseInt(minutes));
  return date;
}

export function formatDatetime(
  userPreferences: IUserGlobalPreferences,
  date: Date
) {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(userPreferences, date);
  return `${formattedDate} ${formattedTime}`;
}
