import { resolveToken } from "./account.utils";
import { detectTimeZone } from "./time.utils";

export function performApiCall(
  endpoint: string,
  method: string,
  body: any = {}
) {
  let token = resolveToken();
  try {
    return fetch(import.meta.env.VITE_API_URL + "/" + endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ ...body, context: getAppLoadContext() })
    });
  } catch (err) {
    console.error(err);
  }
  function getAppLoadContext() {
    const app = import.meta.env.VITE_APP;
    const urlParams = new URLSearchParams(window.location.search);
    return {
      userAgent: navigator.userAgent,
      host: app ?? window.location.host,
      href: window.location.href,
      timezone: detectTimeZone(),
      geo: null,
      referrer: document.referrer,
      urlParams: Object.fromEntries(urlParams.entries())
    };
  }
}
