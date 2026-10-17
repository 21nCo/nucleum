import { performApiCall } from "@nucleum/client/runtime/network/legacy-api";

/** Exchanges a legacy OAuth callback code using the browser session verifier. */
export async function handleOAuthRedirection(
  slug: string,
  code: string | null
) {
  if (!slug || !code) return;
  const app = import.meta.env?.VITE_HOST ?? window.location.hostname;
  const verifier = sessionStorage.getItem("verifier");
  const body = {
    slug,
    code,
    verifier,
    app
  };
  let response = await performApiCall("account/n/oauth", "POST", body);
  if (response) {
    if (response.status === 200) {
      return response;
    }
  }
  return null;
}
