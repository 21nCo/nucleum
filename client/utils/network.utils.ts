import { logger } from "@21n/components/debug/logger.client";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { GlobalEvent } from "@21n/types/event.enum";
import { resolveLegacyToken, signout } from "@21n/utils/account.utils";
import {
  dispatchCustomEvent,
  generateFingerprint,
  isContentScript,
  isExtensionEnvironment
} from "@21n/utils/browser.utils";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { detectTimeZone } from "@21n/utils/time.utils";
import {
  relayToBackgroundScript,
  relayToContentScript
} from "@21n/utils/extension.utils";
import { ExtensionEvent } from "@21n/types/extension.type";
import { relayToSidePanel } from "@21n/utils/extension.utils";
import { stringify } from "@21n/shared-utils/json.utils";

export function resolveRegionalApiUrl() {
  try {
    const tzOffset = -new Date().getTimezoneOffset() * 60;
    if (tzOffset < -10800) {
      return (
        import.meta.env?.VITE_API_US_URL ??
        (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_API_US_URL : undefined)
      );
    } else if (tzOffset > -10800 && tzOffset < 10800) {
      return (
        import.meta.env?.VITE_API_EU_URL ??
        (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_API_EU_URL : undefined)
      );
    } else {
      return (
        import.meta.env?.VITE_API_AS_URL ??
        (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_API_AS_URL : undefined)
      );
    }
  } catch (e) {
    console.warn("Error in resolveRegionalApiUrl", e);
  }
}

export function resolveRegionalApiUrlStrategy(): string {
  try {
    const tzOffset = -new Date().getTimezoneOffset() * 60;
    if (tzOffset <= -10800) {
      return "useast";
    } else if (tzOffset < 10800) {
      return "euwest";
    } else {
      return "insouth";
    }
  } catch (e) {
    console.warn("Error in resolveRegionalApiUrlStrategy", e);
    return "useast";
  }
}

type IPInfoResponse = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  [key: string]: any;
};

function getIPInfoToken(): string {
  return import.meta.env?.VITE_IPINFO_TOKEN ?? "";
}

/**
 * Detects user's region based on their IP address using IPInfo API.
 * Requires VITE_IPINFO_TOKEN environment variable to be set.
 * Get your token at: https://ipinfo.io/
 * @param token - Optional token override for testing
 * @returns Region code (useast, euwest, insouth) or null if detection fails
 */
export async function detectUserRegionFromIP(
  token?: string
): Promise<string | null> {
  try {
    const ipinfoToken = token ?? getIPInfoToken();
    if (!ipinfoToken) {
      console.warn("IPInfo token not configured");
      return null;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://ipinfo.io/json?token=${ipinfoToken}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn("Failed to fetch IP info:", response.status);
        return null;
      }

      const data: IPInfoResponse = await response.json();
      return mapCountryToRegion(data.country);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn("IP info fetch timed out");
      } else {
        console.error("Error fetching IP info:", fetchError);
      }
      return null;
    }
  } catch (error) {
    console.error("Error detecting region from IP:", error);
    return null;
  }
}

function mapCountryToRegion(countryCode?: string): string | null {
  if (!countryCode) return null;

  const usCountries = ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE"];
  const euCountries = [
    "GB",
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "AT",
    "CH",
    "SE",
    "NO",
    "DK",
    "FI",
    "IE",
    "PT",
    "PL",
    "CZ",
    "RO",
    "GR",
    "HU",
    "BG",
    "SK",
    "SI",
    "HR",
    "EE",
    "LV",
    "LT",
    "LU",
    "MT",
    "CY",
    "RU",
    "UA",
    "TR",
    "IL",
    "SA",
    "AE",
    "ZA",
    "EG",
    "KE",
    "NG"
  ];
  const asiaCountries = [
    "IN",
    "CN",
    "JP",
    "KR",
    "SG",
    "MY",
    "TH",
    "ID",
    "PH",
    "VN",
    "AU",
    "NZ",
    "HK",
    "TW",
    "PK",
    "BD",
    "LK"
  ];

  if (usCountries.includes(countryCode)) return "useast";
  if (euCountries.includes(countryCode)) return "euwest";
  if (asiaCountries.includes(countryCode)) return "insouth";

  return null;
}

/**
 * Detects user's region using a two-tier strategy:
 * 1. Primary: IP-based detection using IPInfo API (requires VITE_IPINFO_TOKEN)
 * 2. Fallback: Timezone-based detection using browser timezone offset
 *
 * @returns Region code: 'useast' | 'euwest' | 'insouth'
 */
export async function detectUserRegion(): Promise<string> {
  const ipBasedRegion = await detectUserRegionFromIP();
  if (ipBasedRegion) {
    logger.debug({ at: "detectUserRegion.ip", region: ipBasedRegion });
    return ipBasedRegion;
  }

  const timezoneBasedRegion = resolveRegionalApiUrlStrategy();
  logger.debug({ at: "detectUserRegion.timezone", region: timezoneBasedRegion });
  return timezoneBasedRegion;
}

export async function performApiCall(
  endpoint: string,
  method: "POST" | "GET" | "PUT" | "DELETE",
  body: any = {},
  params?: {
    isFileApi?: boolean;
  }
): Promise<any> {
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
    import.meta.env?.VITE_API_URL ??
    (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_API_URL : undefined);
  if (params?.isFileApi) {
    baseUrl =
      import.meta.env?.VITE_FILE_API_URL ??
      (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_FILE_API_URL : undefined);
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
        import.meta.env?.VITE_HOST ??
        (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_APP_URL : undefined) ??
        host,
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
    let token = await resolveLegacyToken();
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
        } else if (!token) {
          await signout();
          window.location.reload();
        } else {
          logger.log({
            at: "API call unauthorized with AuthFn session",
            message:
              "Skipping automatic sign-out because AuthFn is the authentication source.",
            url: params.url
          });
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
