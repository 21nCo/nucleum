import { logger } from "@21n/components/debug/logger.client";
import type { ClipperExtensionEvent } from "@21n/products/memotron/common/clip.type";
import type { ExtensionEvent } from "@21n/types/extension.type";
import {
  sendToBackground,
  type PlasmoMessaging
} from "@plasmohq/messaging";

type SurrealResponse = {
  result?: string;
  status?: string;
};

type ExtensionRelayMessage = {
  data?: unknown;
  event: ClipperExtensionEvent | ExtensionEvent;
};

type StoredTabPayload = {
  tab?: chrome.tabs.Tab;
};

const sendBackgroundMessage =
  sendToBackground as PlasmoMessaging.SendFx<ClipperExtensionEvent | ExtensionEvent>;

export function interceptSurrealResponse(
  response: SurrealResponse[] | null | undefined,
  context: string = ""
) {
  console.log({ context, response });
  if (!response || !(response.length > 0)) return null;
  return checkSurrealResponse(response[0], false);
}
function checkSurrealResponse(
  response: SurrealResponse,
  isShowErrMessage: boolean = false
) {
  if (response.status === "ERR") {
    const pattern = /Database record `.*` already exists/;
    const match = pattern.test(response.result ?? "");
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
  message: ExtensionRelayMessage,
  tabId?: number
): Promise<unknown> {
  if (!tabId) {
    const tabData = (await chrome.storage.local.get("tab")) as StoredTabPayload;
    tabId = tabData?.tab?.id;
  }
  if (typeof tabId !== "number") {
    throw new Error("Unable to resolve content script tab id");
  }
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: unknown) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export async function relayToSidePanel(message: ExtensionRelayMessage) {
  chrome.runtime.sendMessage(message);
}

export async function relayToBackgroundScript(
  message: ExtensionRelayMessage
): Promise<any> {
  try {
    logger.debug({
      at: "relayToBackgroundScript",
      message,
      chromeRuntimeId: chrome.runtime.id
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error("Background script communication timeout after 10 seconds")
        );
      }, 10000);
    });

    const backgroundPromise = sendBackgroundMessage<typeof message.data, unknown>({
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

export async function openLink(url: string): Promise<chrome.tabs.Tab | undefined> {
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
