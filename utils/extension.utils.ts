import { ExtensionEvent, type TabData } from "../types/extension.type";
import * as CryptoJS from "crypto-js";

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

export async function sendMessageToContentScript(message: any, tabId?: number): Promise<any> {
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
}

export async function resolveCurrentTabData(isParseDOM: boolean = false): Promise<TabData> {
  const tabData = await chrome.storage.local.get("tab");
  console.log({ tabData });
  const tab = tabData?.tab;
  if (!tab) return;
  let hash = "";
  if (!isParseDOM) {
    return {
      url: tab.url,
      label: tab.title,
      metadata: {
        favicon: tab.favIconUrl,
        hostname: new URL(tab.url).hostname,
      },
    }
  }
  try {
    const data = await sendMessageToContentScript({ event: ExtensionEvent.READ_PAGE_CONTENT },tab.id);
    return {
      url: tab.url,
      label: tab.title,
      description: data.description,
      hash,
      metadata: {
        favicon: tab.favIconUrl,
        hostname: new URL(tab.url).hostname,
        ...data.metadata,
      },
    }
  } catch (e) {
    console.error("ERROR", e);
  }
}

/**
 * Extracts full tab data from the current tab.
 * Note: This function should be called only from the content script.
 * @returns TabData
 */
export function extractFullTabData(): TabData {
  const bodyContent = document.body.innerHTML;
  const title = document.title;
  const faviconLink = (
    document.querySelector("link[rel*='icon']") as HTMLLinkElement
  )?.href;
  const appIconLinks = Array.from(
    document.querySelectorAll("link[rel='apple-touch-icon']"),
    (link) => (link as HTMLLinkElement).href
  );
  const description = (
    document.querySelector("meta[name='description']") as HTMLMetaElement
  )?.content;
  const keywords = (
    document.querySelector("meta[name='keywords']") as HTMLMetaElement
  )?.content;
  const ogImage = (
    document.querySelector("meta[property='og:image']") as HTMLMetaElement
  )?.content;
  const ogTitle = (
    document.querySelector("meta[property='og:title']") as HTMLMetaElement
  )?.content;
  const ogDescription = (
    document.querySelector(
      "meta[property='og:description']"
    ) as HTMLMetaElement
  )?.content;
  const ogUrl = (
    document.querySelector("meta[property='og:url']") as HTMLMetaElement
  )?.content;
  const ogSiteName = (
    document.querySelector("meta[property='og:site_name']") as HTMLMetaElement
  )?.content;
  const twitterCard = (
    document.querySelector("meta[name='twitter:card']") as HTMLMetaElement
  )?.content;
  const hash = CryptoJS.SHA256(bodyContent).toString();
  return {
    url: window.location.href,
    hash,
    label: title,
    description,
    metadata: {
      faviconLink,
      appIconLinks,
      keywords,
      ogImage,
      ogTitle,
      ogDescription,
      ogUrl,
      twitterCard
    }
  };
}