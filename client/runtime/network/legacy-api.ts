import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { resolveLegacyToken } from "@nucleum/client/runtime/account/session-token";
import { generateFingerprint } from "@nucleum/client/runtime/device/fingerprint";
import {
  isContentScript,
  isExtensionEnvironment
} from "@21n/shared-utils/browser-environment";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { detectTimeZone } from "@21n/shared-utils/datetime/timezone";
import { relayToBackgroundScript } from "@nucleum/client/runtime/extensions/messaging";
import { ExtensionEvent } from "@nucleum/client/runtime/extensions/extension-event.enum";
import { stringify } from "@21n/shared-utils/json.utils";

import { performHttpNetworkOperation } from "@nucleum/client/runtime/network/http-operation";

/** Calls a legacy API endpoint with its existing auth and host context. */
export async function performApiCall(
  endpoint: string,
  method: "POST" | "GET" | "PUT" | "DELETE",
  body: any = {},
  params?: {
    isFileApi?: boolean;
  }
): Promise<any> {
  const isExtEnv = isExtensionEnvironment();
  if (isExtEnv && isContentScript()) {
    const response = await relayToBackgroundScript({
      event: ExtensionEvent.RUN,
      data: { action: ExtensionEvent.API_CALL, endpoint, method, body, params }
    });
    return response;
  }
  let baseUrl =
    import.meta.env?.VITE_API_URL ??
    (typeof process !== "undefined"
      ? process.env?.PLASMO_PUBLIC_API_URL
      : undefined);
  if (params?.isFileApi) {
    baseUrl =
      import.meta.env?.VITE_FILE_API_URL ??
      (typeof process !== "undefined"
        ? process.env?.PLASMO_PUBLIC_FILE_API_URL
        : undefined);
  }
  const legacyToken = await resolveLegacyToken();
  return performHttpNetworkOperation({
    url: baseUrl + "/" + endpoint,
    method,
    headers: {},
    body: stringify({ ...body, context: await getAppLoadContext() }),
    authToken: legacyToken,
    legacyApi: {
      endpoint,
      isFileApi: Boolean(params?.isFileApi)
    }
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
        import.meta.env?.VITE_HOST ??
        (typeof process !== "undefined"
          ? process.env?.PLASMO_PUBLIC_APP_URL
          : undefined) ??
        host,
      href,
      timezone: detectTimeZone(),
      geo: null,
      referrer,
      urlParams
    };
  }
}
