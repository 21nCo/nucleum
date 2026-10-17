import { determineIfOffline } from "@nucleum/client/runtime/connectivity";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { resolveToken } from "@nucleum/client/runtime/account/session-token";
import { recoverInvalidSession } from "@nucleum/client/runtime/account/session-recovery-host";
import { dispatchCustomEvent } from "@21n/shared-utils/dom-events";
import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { relayToContentScript } from "@nucleum/client/runtime/extensions/messaging";
import { ExtensionEvent } from "@nucleum/client/runtime/extensions/extension-event.enum";
import { relayToSidePanel } from "@nucleum/client/runtime/extensions/messaging";

import {
  type LegacyApiInventoryContext,
  resolveLegacyApiInventoryContext,
  recordLegacyApiInventory,
  serializeInventoryError
} from "@nucleum/client/runtime/network/legacy-api-inventory";

const CUSTOM_ALERT_EVENT = "custom:alert";

/** Executes authenticated HTTP requests with existing session and extension handling. */
export async function performHttpNetworkOperation(params: {
  url: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  headers: any;
  body: any;
  authToken?: string | null;
  legacyApi?: {
    endpoint?: string;
    isFileApi?: boolean;
  };
}) {
  const startedAt = Date.now();
  let inventoryContext: LegacyApiInventoryContext | undefined;
  let inventoryResponseRecorded = false;
  let token: string | null | undefined;
  let isExtEnv = false;
  try {
    const isOffline = await determineIfOffline();
    if (isOffline) return;
    token =
      params.authToken === undefined ? await resolveToken() : params.authToken;
    inventoryContext = resolveLegacyApiInventoryContext(params, token);
    recordLegacyApiInventory(
      inventoryContext
        ? {
            ...inventoryContext,
            event: "request",
            durationMs: 0
          }
        : undefined
    );
    isExtEnv = isExtensionEnvironment();
    if (!token && isExtEnv) {
      logoutOnExtention();
    }
    const response = await fetchWithToken(token);
    recordResponse(response);
    if (!response.ok) {
      if (response.status === 401) {
        const recoveryResponse = await recoverFromUnauthorizedResponse();
        if (recoveryResponse) {
          recordResponse(recoveryResponse);
          if (recoveryResponse.ok) {
            return recoveryResponse;
          }
          await handleFailedResponse(recoveryResponse);
        }
      }
      await handleFailedResponse(response);
    }
    return response;
  } catch (error) {
    if (inventoryContext && !inventoryResponseRecorded) {
      recordLegacyApiInventory({
        ...inventoryContext,
        event: "error",
        durationMs: Date.now() - startedAt,
        error: serializeInventoryError(error)
      });
    }
    if (error instanceof TypeError) {
      let errorMessage = error.message;
      if (error.message === "Failed to fetch") {
        errorMessage =
          "Failed to fetch. Please check your internet connection.";
      }
      logger.error({ at: "Network error", params, errorMessage });

      dispatchCustomEvent(CUSTOM_ALERT_EVENT, {
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

  async function fetchWithToken(currentToken: string | null | undefined) {
    const headers = params.headers ?? {};
    const authorizationHeaders = currentToken
      ? { Authorization: "Bearer " + currentToken }
      : {};
    const body = params.body ?? "";
    return fetch(params.url, {
      method: params.method,
      headers: {
        "Content-Type": "application/json",
        ...authorizationHeaders,
        ...headers
      },
      body
    });
  }

  function recordResponse(response: Response) {
    recordLegacyApiInventory(
      inventoryContext
        ? {
            ...inventoryContext,
            event: "response",
            status: response.status,
            ok: response.ok,
            durationMs: Date.now() - startedAt
          }
        : undefined
    );
    inventoryResponseRecorded = true;
  }

  async function handleFailedResponse(response: Response) {
    const errorText = await response.text();
    logger.error({ at: "API call failed with status", response, errorText });
    throw new Error(`API call failed with status: ${response.status}`);
  }

  async function recoverFromUnauthorizedResponse() {
    if (isExtEnv) {
      logoutOnExtention();
      return;
    }
    if (!token && !(await hasStoredAuthFnSession())) {
      await recoverInvalidSession();
      return;
    }
    if (params.legacyApi && params.authToken) {
      return;
    }
    const hadOriginalToken = Boolean(token);
    const isSessionValid = await revalidateAuthFnSession();
    if (isSessionValid === false) {
      await recoverInvalidSession();
      return;
    }
    if (isSessionValid !== true) return;
    const refreshedToken = await resolveToken();
    const isCookieSessionRetry =
      !hadOriginalToken &&
      !refreshedToken &&
      !params.authToken &&
      !params.legacyApi;
    if (!refreshedToken && !isCookieSessionRetry) return;
    token = refreshedToken;
    const retryResponse = await fetchWithToken(token);
    if (retryResponse.status === 401 && !isCookieSessionRetry) {
      await recoverInvalidSession();
    }
    return retryResponse;
  }

  async function revalidateAuthFnSession() {
    logger.log({
      at: "API call unauthorized with AuthFn session",
      message: "Revalidating AuthFn session before retrying request.",
      url: params.url
    });
    try {
      const { performSessionCheck } =
        await import("@nucleum/client/runtime/account/auth");
      return await performSessionCheck();
    } catch (error) {
      logger.error({
        at: "API call unauthorized AuthFn session revalidation failed",
        error,
        url: params.url
      });
      return undefined;
    }
  }

  async function hasStoredAuthFnSession() {
    const authSession = await clientStorage.get(ClientStorageKey.USER);
    const userInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
    return Boolean(authSession || userInfo);
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
