import { logger } from "@nucleum/client/runtime/logging/logger";
import type { ClipperExtensionEvent } from "@nucleum/client/runtime/extensions/clipper-event.type";
import type { ExtensionEvent } from "@nucleum/client/runtime/extensions/extension-event.enum";
import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";

type ExtensionRelayMessage = {
  data?: unknown;
  event: ClipperExtensionEvent | ExtensionEvent;
};

type StoredTabPayload = {
  tab?: chrome.tabs.Tab;
};

const sendBackgroundMessage = sendToBackground as PlasmoMessaging.SendFx<
  ClipperExtensionEvent | ExtensionEvent
>;

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

/** Relay to side panel. */
export async function relayToSidePanel(message: ExtensionRelayMessage) {
  chrome.runtime.sendMessage(message);
}

/** Relay to background script. */
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

    const backgroundPromise = sendBackgroundMessage<
      typeof message.data,
      unknown
    >({
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
