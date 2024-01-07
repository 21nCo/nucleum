import { onDestroy } from "svelte";
import { localActions } from "$lib/local/stores/localActionMap";
import { actions } from "$lib/tidy/layout/actionMap";
import type { UserDate } from "$lib/tidy/types/userDate.type";
import { appStore, windowObject } from "../stores/app.store";
import { get } from "svelte/store";
import { LaunchContext } from "../types/appStore.type";
import { FileSizeMeasurement } from "../types/fileSizeMeasurement.enum";
import { postToParent } from "./embed.utils";
import { detectTimeZone } from "./time.utils";

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

export function padToTwo(x: number) {
  return x.toString().padStart(2, "0");
}

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
  if (!url) return;
  if (!url.includes("http")) {
    windowObject.gotoPath(url);
    return;
  }
  if (get(appStore).launchContext == LaunchContext.EMBED) {
    postToParent({
      link: url,
    });
  } else {
    let win = window?.open(url, "_blank");
    if (win) {
      win.focus();
    }
  }
}

export function runAction(action: string) {
  let component = resolveComponent(action);
  if (!component) {
    windowObject.gotoPath("404");
    return;
  }
  if (component.fn) component.fn();
  else resolveNavigationAction(action);
}

export function resolveNavigationAction(action: string) {
  let component = resolveComponent(action);
  if (!component) {
    windowObject.gotoPath("404");
    return;
  }
  if (component.link) {
    const url = get(appStore).appData.urls[component.link];
    if (url) openLink(url);
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
export function getAppLoadContext() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    userAgent: navigator.userAgent,
    host: window.location.host,
    href: window.location.href,
    timezone: detectTimeZone(),
    geo: null,
    referrer: document.referrer,
    urlParams: Object.fromEntries(urlParams.entries()),
  };
}

export function performApiCall(
  endpoint: string,
  method: string,
  body: any = {}
) {
  const token = localStorage?.getItem("surreal-token");
  return fetch(import.meta.env.VITE_API_URL + "/" + endpoint, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ ...body, context: getAppLoadContext() }),
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

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
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

export function convertFileSize(
  sizeInBytes: number,
  desiredType: FileSizeMeasurement
) {
  switch (desiredType) {
    case FileSizeMeasurement.BITS:
      return sizeInBytes * 8;
    case FileSizeMeasurement.BYTES:
      return sizeInBytes;
    case FileSizeMeasurement.KILOBYTES:
      return Math.round((sizeInBytes / 1000) * 100) / 100;
    case FileSizeMeasurement.MEGABYTES:
      return Math.round((sizeInBytes / 1000000) * 100) / 100;
    case FileSizeMeasurement.GIGABYTES:
      return Math.round((sizeInBytes / 1000000000) * 100) / 100;
    default:
      return sizeInBytes;
  }
}

export function resolveUiState(uiStates: any, property: string) {
  if (!uiStates) return undefined;
  let value = undefined;
  if (get(windowObject).isInPortraitMode) {
    value = uiStates["portrait"][property];
  } else {
    value = uiStates["desktop"][property];
  }
  if (value === undefined) {
    value = uiStates["all"][property];
  }
  return value;
}
export function setUiState(
  uiStates: any,
  property: string,
  value: any,
  isForAll: boolean = false
) {
  if (isForAll) {
    uiStates["all"][property] = value;
  } else if (get(windowObject).isInPortraitMode) {
    uiStates["portrait"][property] = value;
  } else {
    uiStates["desktop"][property] = value;
  }
  return uiStates;
}

// export function isClient() {
//   return typeof window !== "undefined";
// }
