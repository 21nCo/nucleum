import { onDestroy } from "svelte";
import type { UserGlobalPreferences } from "$lib/tidy/types/preferences.type";
import { localActions } from "$lib/local/stores/localActionMap";
import { actions } from "$lib/tidy/layout/actionMap";
import type { UserDate } from "$lib/tidy/types/userDate.type";
import {
  appStore,
  postMessageToParent,
  userPreferences,
  windowObject,
} from "../stores/app.store";
import { get } from "svelte/store";
import { TimeScale, type TimePeriod, TimePeriodType } from "../types/time.type";
import { TimeFormat } from "../types/time.type";
import { AppTheme, ColorStrength } from "../types/theme.type";
import { ItemType } from "$lib/local/types/item.enum";
import moment from "moment-timezone";
import { LaunchContext } from "../types/appStore.type";

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

export function onInterval(
  callback: () => void,
  milliseconds: number | undefined
) {
  const interval = setInterval(callback, milliseconds);
  onDestroy(() => {
    clearInterval(interval);
  });
  //return interval;
}

export function generateUID() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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

export function padToTwo(x: number) {
  return x.toString().padStart(2, "0");
}

let y = new Date();
y.setDate(new Date().getDate() - 1);
export const yesterday = y;

export function getUserDate(timestamp: number, dayStart: string = "00:00") {
  let dayStartTimeParts = dayStart.split(":");
  let startHours = +dayStartTimeParts[0];
  let startMinutes = +dayStartTimeParts[1];
  let date = new Date(timestamp);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let isSameDay =
    hours > startHours
      ? true
      : hours === startHours
      ? minutes >= startMinutes
      : false;
  let userDate = {
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
  };
  userDate = isSameDay ? userDate : getOneDayEarlier(userDate);
  return userDate;
}

export function compareUserDay(x: UserDate, y: UserDate) {
  if (x.day === y.day && x.year === y.year && x.month === y.month) {
    return 0;
  } else if (
    x.year < y.year ||
    (x.year === y.year && x.month < y.month) ||
    (x.year === y.year && x.month === y.month && x.day < y.day)
  ) {
    return -1;
  } else {
    return 1;
  }
}
export function checkIsToday(x: UserDate, dayStart: string = "00:00") {
  let y = getCurrentUserDate(dayStart);
  return compareUserDay(x, y) === 0;
}
export function checkIsTodayUsingTimestamp(
  x: number,
  dayStart: string = "00:00"
) {
  let y = getCurrentUserDate(dayStart);
  return checkDay(y, x);
}

export function checkDay(
  day: UserDate,
  sessionStartTime: number,
  dayStartSetting: string = "00:00"
) {
  let calculatedDate = getUserDate(sessionStartTime, dayStartSetting);
  return (
    day.year === calculatedDate.year &&
    day.month === calculatedDate.month &&
    day.day === calculatedDate.day
  );
}

export function getDayStartTime(date: UserDate, dayStart: string = "00:00") {
  const [hours, minutes] = dayStart.split(":").map(Number);
  const day = new Date(date.year, date.month, date.day);
  day.setHours(hours, minutes, 0, 0);
  return day.getTime();
}

export function getOneDayLater(date: UserDate) {
  let currentDate = new Date(date.year, date.month, date.day);
  const oneDayLater = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  return {
    day: oneDayLater.getDate(),
    month: oneDayLater.getMonth(),
    year: oneDayLater.getFullYear(),
  };
}

export function getOneDayEarlier(date: UserDate) {
  let currentDate = new Date(date.year, date.month, date.day);
  const oneDayEarlier = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  return {
    day: oneDayEarlier.getDate(),
    month: oneDayEarlier.getMonth(),
    year: oneDayEarlier.getFullYear(),
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
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

export function getDateDifferenceFromToday(date: UserDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.year, date.month, date.day);
  return Math.round((+inputDate - +today) / (1000 * 60 * 60 * 24));
}

export function getCurrentUserDate(dayStart: string = "00:00") {
  const now = new Date().getTime();
  return getUserDate(now, dayStart);
}
export function getJustDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function generateSessionId(timestamp: number) {
  return String(Math.floor(timestamp));
}

export function borderColor(
  theme: string,
  colorStrength: ColorStrength = ColorStrength.Normal
) {
  if (theme === AppTheme.Glassy) return "border-none";
  switch (colorStrength) {
    case ColorStrength.Subtle:
      return "border-brs1";
    case ColorStrength.Normal:
      return "border-brs2";
    case ColorStrength.Strong:
      return "border-brs3";
    default:
      return "border-brs2";
  }
}
export function bg(
  theme: string,
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  const colors = generateBackgroudColor(parentBackgroundIndex);
  return theme === AppTheme.Glassy
    ? isActive
      ? "glassactive"
      : "glass"
    : isActive
    ? colors.activeBackgroundColor
    : colors.backgroundColor;
}

export function generateBackgroudColor(parentBackgroundIndex: number = 1) {
  let activeBackgroundColor;
  let backgroundColor;
  let activeBackgroundColorHex;
  let backgroundColorHex;
  let currentColors = retrieveCurrentColors(get(userPreferences));
  if (parentBackgroundIndex === 1) {
    activeBackgroundColor = "bg-bgs3";
    activeBackgroundColorHex = currentColors?.bgs3;
    backgroundColor = "bg-bgs2";
    backgroundColorHex = currentColors?.bgs2;
  } else if (parentBackgroundIndex === 2) {
    activeBackgroundColor = "bg-bgs4";
    activeBackgroundColorHex = currentColors?.bgs4;
    backgroundColor = "bg-bgs3";
    backgroundColorHex = currentColors?.bgs3;
  } else if (parentBackgroundIndex === 3) {
    activeBackgroundColor = "bg-bgs4";
    activeBackgroundColorHex = currentColors?.bgs4;
    backgroundColor = "bg-bgs4";
    backgroundColorHex = currentColors?.bgs4;
  } else {
    activeBackgroundColor = "bg-bgs2";
    activeBackgroundColorHex = currentColors?.bgs2;
    backgroundColor = "bg-bgs1";
    backgroundColorHex = currentColors?.bgs1;
  }
  return {
    activeBackgroundColor,
    backgroundColor,
    activeBackgroundColorHex,
    backgroundColorHex,
  };
}
export function retrieveCurrentColors(userPreferences: UserGlobalPreferences) {
  let colorScheme = userPreferences.colorScheme?.colors;
  return colorScheme;
}

export function removeDuplicatesById(items: any[]) {
  return items.filter((item, index, arr) => {
    return index === arr.findIndex((other) => other.id === item.id);
  });
}

export function assignSatAndLight(
  userPreferences: UserGlobalPreferences,
  selectableColorParams: any
) {
  let saturation;
  let lightness;
  if (!userPreferences || !selectableColorParams) return;
  if (userPreferences.colorScheme.isDark) {
    saturation = selectableColorParams.darkSaturation;
    lightness = selectableColorParams.darkLightness;
  } else {
    saturation = selectableColorParams.lightSaturation;
    lightness = selectableColorParams.lightLightness;
  }
  return { saturation, lightness };
}

export function resolveComponent(action: string) {
  let component = localActions.find((x) => x.action == action);
  if (component) return component;
  component = actions.find((x) => x.action == action);
  if (component) return component;
  return null;
}

export function resolveComponentFromPath(path: string) {
  let component = localActions.find((x) => x.path == path);
  if (component) return component;
  component = localActions.find((x) => x.action == path);
  if (component) return component;
  component = actions.find((x) => x.path == path);
  if (component) return component;
  component = actions.find((x) => x.action == path);
  if (component) return component;
  return null;
}

export function openLink(url: string) {
  if (get(appStore).launchContext == LaunchContext.EMBED) {
    postMessageToParent({
      link: url,
    });
  } else {
    let win = window?.open(url, "_blank");
    if (win) {
      win.focus();
    }
  }
}

export function resolveAction(action: string) {
  let component = resolveComponent(action);
  if (!component) {
    windowObject.gotoPath("404");
    return;
  }
  if (component.link) {
    const url = get(appStore).appData.urls[component.link];
    if (url) openLink(url);
    return;
  } else if (component.component) {
    windowObject.gotoPath("/" + (component.path ?? component.action));
    return;
  }
}

export function getAssociatedPlayerFromPath(path: string) {
  let player = undefined;
  let component = localActions.find((x) => x.associatedPlayer == path);
  if (component) player = component;
  else {
    component = actions.find((x) => x.associatedPlayer == path);
    if (component) player = component;
  }
  return player;
}

export function isValidEmail(text: string) {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,}$/;
  return emailRegex.test(text);
}
export function isValidParentDomain(text: string) {
  const domainRegex = /^(?:[a-zA-Z0-9-]{1,}\.){1,}[a-zA-Z0-9]{2,}$/;
  return domainRegex.test(text);
}

export function performApiCall(
  endpoint: string,
  method: string,
  body: string = ""
) {
  return fetch(import.meta.env.VITE_API_URL + "/" + endpoint, {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  });
}
export function performBlankApiCall(
  endpoint: string,
  method: string,
  body: string = ""
) {
  return fetch(import.meta.env.VITE_BLANK_API_URL + "/" + endpoint, {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  });
}

export function getNextInLoop(list: any, index: number) {
  const nextIndex = index + 1;
  if (nextIndex < list.length) {
    return list[nextIndex];
  }
  return list[0];
}

export function determineTimePeriod(period: TimePeriod) {
  let begin = new Date();
  let end = new Date();
  let title;
  if (period.scale === TimeScale.SINGLEDAY) {
    if (period.type === TimePeriodType.UPPERHORIZON) {
      if (period.horizons?.[0] == 0) {
        begin.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        title = "Today";
      } else if (period.horizons?.[0] < 0) {
        const whileAgo = Math.abs(period.horizons?.[0]);
        begin.setDate(begin.getDate() - whileAgo);
        begin.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - whileAgo);
        end.setHours(23, 59, 59, 999);
        if (whileAgo === 1) title = "Yesterday";
        else if (whileAgo === 365) title = "Same day last year";
        else title = `${whileAgo} days ago`;
      }
    }
  } else if (period.scale === TimeScale.DAYS) {
    if (period.type === TimePeriodType.LASTXSEGMENTS) {
      begin.setDate(begin.getDate() - period.numberOfSegments);
      title = `Last ${period.numberOfSegments} days`;
    } else if (period.type === TimePeriodType.UPPERHORIZON) {
      const year = period.horizons[0];
      const month = period.horizons[1];
      begin.setFullYear(year);
      begin.setMonth(month);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(month);
      end.setDate(31);
      title = `Days of ${months[month]} ${year}`;
    }
  } else if (period.scale === TimeScale.MONTHS) {
    if (period.type === TimePeriodType.LASTXSEGMENTS) {
      begin.setMonth(begin.getMonth() - period.numberOfSegments);
      title = `Last ${period.numberOfSegments} months`;
    } else if (period.type === TimePeriodType.UPPERHORIZON) {
      const year = period.horizons[0];
      begin.setFullYear(year);
      begin.setMonth(0);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(11);
      end.setDate(31);
      title = `Months of ${year}`;
    }
  } else if (period.scale === TimeScale.YEARS) {
    if (period.type === TimePeriodType.LASTXSEGMENTS) {
      begin.setFullYear(begin.getFullYear() - period.numberOfSegments);
      title = `Last ${period.numberOfSegments} years`;
    } else if (period.type === TimePeriodType.UPPERHORIZON) {
      const year = period.horizons[0];
      begin.setFullYear(year);
      begin.setMonth(0);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(11);
      end.setDate(31);
      title = `Year ${year}`;
    }
  }
  return { begin, end, title };
}

export function properCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

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

export function sortPropertiesByOrder(obj: any) {
  const entries = Object.entries(obj);
  //@ts-ignore
  const sortedEntries = entries
    .filter(([, value]) => value.visibility !== false)
    .sort(([, a], [, b]) => a.order - b.order);
  const sortedObj = Object.fromEntries(sortedEntries);
  return sortedObj;
}

export function prefix(id: string, itemType: ItemType) {
  return `${ItemType[itemType]}:${id}`;
}

export function stripPrefix(id: string) {
  return id.split(":")[1];
}

export function appendTableNameInId(id: string, tableName: ItemType) {
  return `${ItemType[tableName]}:${id}`;
}
export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
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

export function actIfClickedOutside(
  event: PointerEvent, //The event that is triggered when clicked (passed down from the event listener)
  target: string, //This should be same as the class,id or tag(i.e target) of the div outside of which when clicked, an action is performed
  action: any
) {
  const nodeTarget = document.querySelector(target);
  !nodeTarget?.contains(event.target as Node) && action();
  //Basically we are checking whether or not the clicked element is inside the task-text or is the task-text itself
}
