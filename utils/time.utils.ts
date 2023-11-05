import {
  TimePeriodType,
  type TimePeriod,
  TimeScale,
  TimeFormat,
} from "../types/time.type";
import moment from "moment-timezone";
import type { UserDate } from "../types/userDate.type";
import { get } from "svelte/store";
import { userPreferences } from "../stores/app.store";

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
  "Dec",
];

export function formatTime(date: Date, format: string | undefined = undefined) {
  let userPreferredFormat = get(userPreferences).timeFormat;
  format = format ? format : userPreferredFormat ?? "meridian";
  if (format === "24") {
    let hours = date?.getHours().toString().padStart(2, "0");
    let minutes = date?.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } else if (format === "meridian") {
    let hours = date?.getHours();
    let minutes = date?.getMinutes().toString().padStart(2, "0");
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
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
  const { scale, type, value } = period;
  if (typeof value != "number") return;
  if (type === TimePeriodType.RELATIVE) {
    if (value === 0) {
      if (scale === TimeScale.DAYS) return "Today";
      else return `This ${scale.toLowerCase()}`;
    } else if (value === 1) {
      if (scale === TimeScale.DAYS) return "Tomorrow";
      else return `Next ${scale.toLowerCase()}`;
    } else if (value === -1) {
      if (scale === TimeScale.DAYS) return "Yesterday";
      else return `Last ${scale.toLowerCase()}`;
    } else if (value < 0) {
      return `Last ${Math.abs(value)} ${scale.toLowerCase()}`;
    } else if (value > 0) {
      return `Next ${value} ${scale.toLowerCase()}`;
    }
  }
  // else if (type === TimePeriodType.HORIZON) {
  //   if (scale === TimeScale.DAYS) {
  //     if (value === 0) return "Today";
  //     else if (value === -1) return "Yesterday";
  //     else if (value === -365) return "Same day last year";
  //     else if (value < 0) return `${Math.abs(value)} days ago`;
  //     else return `${value} days ago`;
  //   } else {
  //     if (value === 0) return "This " + scale.toLowerCase().split("s")[0];
  //     else if (value === -1) return "Last " + scale.toLowerCase().split("s")[0];
  //     else if (value < 0)
  //       return `${Math.abs(value)} ${scale.toLowerCase()}s ago`;
  //     else return `${value} ${scale.toLowerCase()}s ago`;
  //   }
  // }
}

export function determineTimePeriod(period: TimePeriod) {
  let begin = new Date();
  let end = new Date();
  let title;
  if (
    period.type === TimePeriodType.START_END &&
    period.value instanceof Object &&
    "start" in period.value &&
    "end" in period.value
  ) {
    begin = period.value.start;
    end = period.value.end;
    return { begin, end, title: "" };
  }
  if (period.scale === TimeScale.DAYS) {
    if (
      period.type === TimePeriodType.RELATIVE &&
      typeof period.value === "number"
    ) {
      begin.setDate(begin.getDate() + period.value);
      title = timePeriodLabel(period);
    } else if (
      period.type === TimePeriodType.CALENDAR_BOUND &&
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
      period.type === TimePeriodType.RELATIVE &&
      typeof period.value === "number"
    ) {
      begin.setMonth(begin.getMonth() + period.value);
      title = timePeriodLabel(period);
      begin.setDate(1);
      end.setDate(31);
    } else if (
      period.type === TimePeriodType.CALENDAR_BOUND &&
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
      period.type === TimePeriodType.RELATIVE &&
      typeof period.value === "number"
    ) {
      begin.setFullYear(begin.getFullYear() + period.value);
      title = timePeriodLabel(period);
      begin.setDate(1);
      end.setDate(31);
      begin.setMonth(0);
      end.setMonth(11);
    } else if (
      period.type === TimePeriodType.CALENDAR_BOUND &&
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
      name: zone,
      offset: formattedOffset,
    };
  });
};

export function detectTimeZone() {
  const timeZones = getTimeZonesWithOffsets();
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? timeZones[0].name
    );
  } catch (error) {
    console.error("Could not detect time zone:", error);
    return timeZones[0].name;
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
    "Saturday",
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
