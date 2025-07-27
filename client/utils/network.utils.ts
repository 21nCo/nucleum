import { logger } from "../components/debug/logger.client";
import { ClientStorageKey } from "../persistence/persistence.type";
import { GlobalEvent } from "../types/event.enum";
import { resolveToken, signout } from "./account.utils";
import {
  dispatchCustomEvent,
  generateFingerprint,
  isContentScript,
  isExtensionEnvironment
} from "./browser.utils";
import { clientStorage } from "../persistence/persistence.utils";
import { detectTimeZone } from "./time.utils";
import {
  relayToBackgroundScript,
  relayToContentScript
} from "./extension.utils";
import { ExtensionEvent } from "../types/extension.type";
import { relayToSidePanel } from "./extension.utils";
import { stringify } from "$lib/shared/utils/json.utils";

export function resolveRegionalApiUrl() {
  try {
    const tzOffset = -new Date().getTimezoneOffset() * 60;
    if (tzOffset < -10800) {
      return (
        import.meta.env?.VITE_API_US_URL ?? process.env.PLASMO_PUBLIC_API_US_URL
      );
    } else if (tzOffset > -10800 && tzOffset < 10800) {
      return (
        import.meta.env?.VITE_API_EU_URL ?? process.env.PLASMO_PUBLIC_API_EU_URL
      );
    } else {
      return (
        import.meta.env?.VITE_API_AS_URL ?? process.env.PLASMO_PUBLIC_API_AS_URL
      );
    }
  } catch (e) {
    console.warn("Error in resolveRegionalApiUrl", e);
  }
}

export async function performApiCall(
  endpoint: string,
  method: "POST" | "GET" | "PUT" | "DELETE",
  body: any = {},
  params?: {
    isFileApi?: boolean;
  }
) {
  // console.log("Performing API call:", { endpoint, method, body });
  const isExtEnv = isExtensionEnvironment();
  if (isExtEnv && isContentScript()) {
    const response = await relayToBackgroundScript({
      event: ExtensionEvent.RUN,
      data: { action: ExtensionEvent.API_CALL, endpoint, method, body, params }
    });
    return response;
  }
  let baseUrl =
    import.meta.env?.VITE_API_URL ?? process.env.PLASMO_PUBLIC_API_URL;
  if (params?.isFileApi) {
    baseUrl =
      import.meta.env?.VITE_FILE_API_URL ??
      process.env.PLASMO_PUBLIC_FILE_API_URL;
  }
  return performHttpNetworkOperation({
    url: baseUrl + "/" + endpoint,
    method,
    headers: {},
    body: stringify({ ...body, context: await getAppLoadContext() })
  });
  async function getAppLoadContext() {
    const deviceFingerprint = await generateFingerprint();
    const dapId = clientStorage.get(ClientStorageKey.DAP_ID);
    let origin = "";
    let href = "";
    let referrer = "";
    let urlParams = {};
    let host = "";
    if (!isExtEnv) {
      origin = window.location.origin;
      href = window.location.href;
      referrer = document.referrer;
      urlParams = Object.fromEntries(
        new URLSearchParams(window.location.search).entries()
      );
      host = window.location.host;
    }
    return {
      userAgent: navigator.userAgent,
      origin,
      dapId,
      deviceFingerprint,
      host:
        import.meta.env?.VITE_HOST ?? process.env.PLASMO_PUBLIC_APP_URL ?? host,
      href,
      timezone: detectTimeZone(),
      geo: null,
      referrer,
      urlParams
    };
  }
}

export async function performStaticDataOperation(path: string) {
  const isOffline = await determineIfOffline();
  if (isOffline) return;
  return fetch(
    import.meta.env?.VITE_STATIC_URL + "/" + path + "?v=" + Date.now()
  );
}

export async function performHttpNetworkOperation(params: {
  url: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  headers: any;
  body: any;
}) {
  try {
    const isOffline = await determineIfOffline();
    if (isOffline) return;
    let token = await resolveToken();
    const isExtEnv = isExtensionEnvironment();
    if (!token && isExtEnv) {
      logoutOnExtention();
    }
    const headers = params.headers ?? {};
    const body = params.body ?? "";
    const response = await fetch(params.url, {
      method: params.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        ...headers
      },
      body
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ at: "API call failed with status", response, errorText });
      if (response.status === 401) {
        if (isExtEnv) {
          logoutOnExtention();
        } else {
          await signout();
          window.location.reload();
        }
      }
      throw new Error(`API call failed with status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      let errorMessage = error.message;
      if (error.message === "Failed to fetch") {
        errorMessage =
          "Failed to fetch. Please check your internet connection.";
      }
      logger.error({ at: "Network error", params, errorMessage });
      //TEMP - 401 from /sql endpoint is erroring instead of response.status === 401
      // signout();
      dispatchCustomEvent(GlobalEvent.CUSTOM_ALERT, {
        error: "networkerror",
        message: errorMessage
      });
      throw new Error("Network error. Please check your internet connection.");
    } else if (error instanceof Error) {
      logger.error({ at: "API call failed", error: error.message });
      throw error;
    } else {
      logger.error({ at: "Unknown error", error: error });
      throw new Error("An unknown error occurred");
    }
  }

  function logoutOnExtention() {
    const message = {
      event: ExtensionEvent.TOKEN_NOT_FOUND,
      data: {}
    };
    relayToSidePanel(message);
    relayToContentScript(message);
  }
}

export async function determineIfOffline() {
  const isOfflineMode = await clientStorage.get(ClientStorageKey.OFFLINE_MODE);
  const isNetworkInducedOfflineMode = !navigator.onLine;
  return (
    (isOfflineMode && isOfflineMode === "true") || isNetworkInducedOfflineMode
  );
}
