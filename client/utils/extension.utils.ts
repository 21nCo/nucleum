import { logger } from "@21n/components/debug/logger.client";
import type { ClipperExtensionEvent } from "@21n/products/memotron/common/clip.type";
import type { ExtensionEvent } from "@21n/types/extension.type";
import { sendToBackground } from "@plasmohq/messaging";

//TODO - Temp - use utils.ts after lib refactoring
export function interceptSurrealResponse(response: any, context: string = "") {
  console.log({ context, response });
  if (!response || !(response.length > 0)) return null;
  return checkSurrealResponse(response[0], false);
}
function checkSurrealResponse(
  response: any,
  isShowErrMessage: boolean = false
) {
  if (response.status === "ERR") {
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

/**
 * @param message
 * @param tabId
 * @returns
 */
export async function relayToContentScript(
  message: { event: ExtensionEvent | ClipperExtensionEvent; data?: any },
  tabId?: number
): Promise<any> {
  if (!tabId) {
    const tabData = await chrome.storage.local.get("tab");
    tabId = tabData?.tab?.id;
  }
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  //TODO - use the below way to resolve tab instead of storing tab to chrome.storage and retriving it back
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

export async function relayToSidePanel(message: {
  event: ExtensionEvent | ClipperExtensionEvent;
  data?: any;
}) {
  chrome.runtime.sendMessage(message);
}

export async function relayToBackgroundScript(message: {
  event: ExtensionEvent | ClipperExtensionEvent;
  data?: any;
}) {
  // return new Promise((resolve, reject) => {
  //   chrome.runtime.sendMessage(message, (response) => {
  //     if (chrome.runtime.lastError) {
  //       reject(chrome.runtime.lastError);
  //     } else {
  //       resolve(response);
  //     }
  //   });
  // });
  try {
    logger.debug({
      at: "relayToBackgroundScript",
      message,
      chromeRuntimeId: chrome.runtime.id
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error("Background script communication timeout after 10 seconds")
        );
      }, 10000);
    });

    const backgroundPromise = sendToBackground({
      name: message.event,
      body: message.data,
      extensionId: chrome.runtime.id
    });

    const response = await Promise.race([backgroundPromise, timeoutPromise]);

    logger.log({
      at: "relayToBackgroundScript - response",
      response
    });
    return response;
  } catch (error) {
    logger.error({
      at: "relayToBackgroundScript - error",
      error
    });
    throw error;
  }
}

export async function openLink(url: string) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: url }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(tab);
      }
    });
  });
}

export async function openAppPath(path: string) {
  return openLink(resolveAppPath(path));
}

export function resolveAppPath(path: string) {
  const appUrl =
    (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_APP_URL : undefined) ??
    "https://web.memotron.app";
  return appUrl + "/" + path;
}
