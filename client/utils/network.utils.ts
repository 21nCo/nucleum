import { resolveToken } from "./account.utils";
import { detectTimeZone } from "./time.utils";

export function resolveRegionalApiUrl() {
  const tzOffset = -new Date().getTimezoneOffset() * 60;
  if (tzOffset < -10800) {
    return import.meta.env.VITE_API_US_URL;
  } else if (tzOffset > -10800 && tzOffset < 10800) {
    return import.meta.env.VITE_API_EU_URL;
  } else {
    return import.meta.env.VITE_API_AS_URL;
  }
}

export function performApiCall(
  endpoint: string,
  method: string,
  body: any = {}
) {
  let token = resolveToken();
  try {
    return fetch(
      (resolveRegionalApiUrl() ?? import.meta.env.VITE_API_URL) +
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
  } catch (err) {
    console.error(err);
  }
  function getAppLoadContext() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      userAgent: navigator.userAgent,
      host: window.location.host,
      href: window.location.href,
      timezone: detectTimeZone(),
      geo: null,
      referrer: document.referrer,
      urlParams: Object.fromEntries(urlParams.entries())
    };
  }
}
