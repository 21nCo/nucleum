import { resolveToken, signout } from "./account.utils";
import { isExtensionEnvironment } from "./browser.utils";
import { detectTimeZone } from "./time.utils";

export function resolveRegionalApiUrl() {
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
}

export async function performApiCall(
  endpoint: string,
  method: "POST" | "GET" | "PUT" | "DELETE",
  body: any = {}
) {
  console.log("Performing API call:", { endpoint, method, body });
  return performHttpNetworkOperation({
    url:
      (resolveRegionalApiUrl() ??
        import.meta.env?.VITE_API_URL ??
        process.env.PLASMO_PUBLIC_API_URL) +
      "/" +
      endpoint,
    method,
    headers: {},
    body: JSON.stringify({ ...body, context: getAppLoadContext() })
  });
  function getAppLoadContext() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      host:
        import.meta.env?.VITE_HOST ??
        process.env.PLASMO_PUBLIC_HOST ??
        window.location.host,
      href: window.location.href,
      timezone: detectTimeZone(),
      geo: null,
      referrer: document.referrer,
      urlParams: Object.fromEntries(urlParams.entries())
    };
  }
}

export async function performHttpNetworkOperation(params: {
  url: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  headers: any;
  body: any;
}) {
  try {
    let token = await resolveToken();
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
      //TEMP - 401 from /sql endpoint is erroring instead of response.status === 401
      signout();
      throw new Error("Network error. Please check your internet connection.");
    } else if (error instanceof Error) {
      console.error("API call failed:", error.message);
      throw error;
    } else {
      console.error("Unknown error:", error);
      throw new Error("An unknown error occurred");
    }
  }
}
