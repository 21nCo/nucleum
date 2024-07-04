import { resolveToken, signout } from "./account.utils";
import { isExtensionEnvironment } from "./browser.utils";
import { detectTimeZone } from "./time.utils";

export function resolveRegionalApiUrl() {
  const tzOffset = -new Date().getTimezoneOffset() * 60;
  if (tzOffset < -10800) {
    return import.meta.env?.VITE_API_US_URL  ?? process.env.PLASMO_PUBLIC_API_US_URL;
  } else if (tzOffset > -10800 && tzOffset < 10800) {
    return import.meta.env?.VITE_API_EU_URL ?? process.env.PLASMO_PUBLIC_API_EU_URL;
  } else {
    return import.meta.env?.VITE_API_AS_URL ?? process.env.PLASMO_PUBLIC_API_AS_URL;
  }
}

export async function performApiCall(
  endpoint: string,
  method: string,
  body: any = {}
) {
  let token = await resolveToken();
  try {
    const response = await fetch(
      (resolveRegionalApiUrl() ?? import.meta.env?.VITE_API_URL ?? process.env.PLASMO_PUBLIC_API_URL) +
        "/" +
        endpoint,
      {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ ...body, context: getAppLoadContext() })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "API call failed with status:",
        response.status,
        "Response:",
        errorText
      );
      if (response.status === 401 && !isExtensionEnvironment()) {
        signout();
      }
      throw new Error(`API call failed with status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("Network error:", error.message);
      throw new Error("Network error. Please check your internet connection.");
    } else if (error instanceof Error) {
      console.error("API call failed:", error.message);
      throw error;
    } else {
      console.error("Unknown error:", error);
      throw new Error("An unknown error occurred");
    }
  }
  function getAppLoadContext() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      host: import.meta.env?.VITE_HOST ?? process.env.PLASMO_PUBLIC_HOST ?? window.location.host,
      href: window.location.href,
      timezone: detectTimeZone(),
      geo: null,
      referrer: document.referrer,
      urlParams: Object.fromEntries(urlParams.entries())
    };
  }
}
