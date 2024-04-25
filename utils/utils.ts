import { onDestroy } from "svelte";
import type { UserDate } from "$lib/tidy/types/userDate.type";
import { appStore } from "../stores/app.store";
import actions from "$lib/tidy/stores/actions.store";
import view from "$lib/tidy/stores/view.store";
import modalEvent from "../components/modal/modal.store";
import {
  toasts,
  confirmationNotification
} from "$lib/tidy/stores/notification.store";
import { get } from "svelte/store";
import { LaunchContext } from "../types/appStore.type";
import { FileSizeMeasurement } from "../types/fileSizeMeasurement.enum";
import { postToParent } from "./embed.utils";
import { detectTimeZone } from "./time.utils";
import { ActionType, type Action } from "../types/action.type";
import { isValidArrayWithData } from "./obj.utils";
import { resolveToken } from "./account.utils";

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
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
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
    year: date.getFullYear()
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
    year: oneDayLater.getFullYear()
  };
}

export function getOneDayEarlier(date: UserDate) {
  let currentDate = new Date(date.year, date.month, date.day);
  const oneDayEarlier = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  return {
    day: oneDayEarlier.getDate(),
    month: oneDayEarlier.getMonth(),
    year: oneDayEarlier.getFullYear()
  };
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
  let component = get(actions).find(
    (x) => x.action.toLowerCase() == action.toLowerCase()
  );
  if (component) return component;
  return null;
}

export function resolveComponentFromPath(path: string) {
  let component = get(actions).find((x) => x.path == path);
  if (component) return component;
  component = get(actions).find((x) => x.action == path);
  if (component) return component;
  if (component) return component;
  return null;
}

export function openLink(url: string) {
  if (!url) return;
  if (!url.includes("http")) {
    view.gotoPath(url);
    return;
  }
  if (get(appStore).launchContext == LaunchContext.EMBED) {
    postToParent({
      link: url
    });
  } else {
    let win = window?.open(url, "_blank");
    if (win) {
      win.focus();
    }
  }
}

export async function runAction(
  action: string,
  componentParams: any = undefined
) {
  let component = resolveComponent(action);
  if (!component) {
    view.gotoPath("404");
    return;
  }
  if (
    component.type === ActionType.MODAL ||
    component.type === ActionType.META_MODAL
  ) {
    modalEvent.notify({
      path: component.action,
      isShow: true,
      componentParams,
      ...component.modalParams
    });
  } else if (
    component.type === ActionType.CONFIRMATION &&
    component.confirmation
  ) {
    confirmationNotification.notify(component.confirmation);
  } else if (component.fn) return await component.fn(componentParams);
  else resolveNavigationAction(action);
}

export function resolveNavigationAction(action: string) {
  let component = resolveComponent(action);
  if (!component) {
    view.gotoPath("404");
    return;
  }
  runNavigationAction(component);
}
export function runNavigationAction(action: Action) {
  if (action.type === ActionType.LINK && action.link) {
    const url = get(appStore).appData.urls[action.link];
    if (url) openLink(url);
  } else if (action.component) {
    view.gotoPath("/" + (action.path ?? action.action));
    return;
  }
}

export function getAssociatedPlayerFromPath(path: string) {
  let player = undefined;
  let component = get(actions).find((x) => x.associatedPlayer == path);
  if (component) player = component;
  return player;
}
export function getAppLoadContext() {
  const app = import.meta.env.VITE_APP;
  const urlParams = new URLSearchParams(window.location.search);
  return {
    userAgent: navigator.userAgent,
    host: app ?? window.location.host,
    href: window.location.href,
    timezone: detectTimeZone(),
    geo: null,
    referrer: document.referrer,
    urlParams: Object.fromEntries(urlParams.entries())
  };
}

export function performApiCall(
  endpoint: string,
  method: string,
  body: any = {}
) {
  let token = resolveToken();
  try {
    return fetch(import.meta.env.VITE_API_URL + "/" + endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ ...body, context: getAppLoadContext() })
    });
  } catch (err) {
    console.error(err);
  }
}

/**
 * !Deprecated - Use performApiCall
 * @param endpoint
 * @param method
 * @param body
 * @returns
 */
export function performBlankApiCall(
  endpoint: string,
  method: string,
  body: string = ""
) {
  return fetch(import.meta.env.VITE_BLANK_API_URL + "/" + endpoint, {
    method: method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body
  });
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
/**
 * Checks if the event target is outside the target element and performs the action if true.
 * @param event the event object
 * @param target the target element
 * @param action the action to be performed
 */
export function actIfClickedOutside(
  event: PointerEvent | MouseEvent,
  target: string | string[],
  action: any
) {
  const targets = Array.isArray(target) ? target : [target];
  const clickedOutsideAllTargets = targets.every((t) => {
    const nodeTarget = document.querySelector("#" + t);
    return !nodeTarget?.contains(event.target as Node);
  });
  if (clickedOutsideAllTargets) {
    action();
  }
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
  if (get(view).isPortrait) {
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
  } else if (get(view).isPortrait) {
    uiStates["portrait"][property] = value;
  } else {
    uiStates["desktop"][property] = value;
  }
  return uiStates;
}

// export function isClient() {
//   return typeof window !== "undefined";
// }

export function generateCmdType(actionType: ActionType) {
  switch (actionType) {
    case ActionType.PAGE:
      return "page";
    case (ActionType.MODAL, ActionType.FUNCTION):
      return "action";
    case ActionType.LINK:
      return "link";
    default:
      return "action";
  }
}

export function download(data: string, label: string | null = null) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (label ?? "data") + ".json";
  link.click();
  URL.revokeObjectURL(url);
}

export function interceptSurrealResponse(response: any, context: string = "") {
  console.log({ context, response });
  if (!response || !isValidArrayWithData(response)) return null;
  return checkSurrealResponse(response[0], false);
}
export function checkSurrealResponse(
  response: any,
  isShowErrMessage: boolean = false
) {
  if (response.status === "ERR") {
    if (isShowErrMessage)
      toasts.error("Something went wrong. Please try again", "ERR: S001");
    const pattern = /Database record `.*` already exists/;
    const match = pattern.test(response.result);
    if (match) return "Record already exists";
    else return null;
  } else if (response.status === "OK" && response.result) {
    return response.result;
  } else {
    return response.status === "OK";
  }
}

export function extractProduct(host: string) {
  const domain = host.split(/\.com|\.org|\.io|\.run/)[0];
  const parts = domain.split(".");
  const product = parts[parts.length - 1];
  const subdomain = parts[parts.length - 2];
  const env = resolveEnv(subdomain);
  return { product, env };
}

function resolveEnv(subdomain: string) {
  if (!subdomain || subdomain.includes("landing")) {
    return "landing";
  } else if (subdomain.includes("dev")) {
    return "dev";
  } else if (subdomain.includes("pre")) {
    return "pre";
  } else if (
    subdomain === "app" ||
    subdomain === "embed" ||
    subdomain === "ios" ||
    subdomain === "android" ||
    subdomain === "web" ||
    subdomain === "www" ||
    subdomain === "desktop"
  ) {
    return "live";
  } else {
    return "landing";
  }
}
/**
 * Used to create a debounced version of a function so that the uneccessary calls to that function can be reduced. Closure is used to remember the previous timer. "this" is used here to remember the context of the func passed and "apply" is used to apply the remembered context.
 * @summary To create a debounced version of a function.
 * @param func the function to be debounced
 * @param timeout recycled wait time before the function is called
 * @returns {Function} the debounced function
 */
export function debouncer(func: any, timeout: number) {
  let timer: any;
  return function (this: any, ...args: any) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
