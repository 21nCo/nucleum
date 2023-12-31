import { goto } from "$app/navigation";
import { get } from "svelte/store";
import { appStore } from "../stores/app.store";
import type {
  IdentityProvider,
  OAuthProviderConfig,
} from "../types/oauth.type";
import { performApiCall } from "./utils";

export function initiateOAuth2Flow(provider: IdentityProvider) {
  const oAuthConfig: OAuthProviderConfig[] = get(appStore).appData?.oAuthConfig;
  console.log(oAuthConfig);
  if (!oAuthConfig || oAuthConfig.length < 1) return;
  const config = oAuthConfig.find((c) => c.provider === provider);
  if (!config) return;
  goto(
    config.authorise_url +
      "?client_id=" +
      config.client_id +
      "&redirect_uri=" +
      import.meta.env.VITE_OAUTH_REDIRECT_BASE_URL +
      "/" +
      config.oauth_slug +
      "&scope=" +
      config.scope +
      "&response_type=code" +
      "&state=state&code_challenge=challenge&code_challenge_method=plain"
  );
}

export async function handleOAuthRedirection(
  slug: string,
  code: string | null
) {
  if (!slug || !code) return;
  const app = import.meta.env.VITE_APP ?? window.location.hostname;
  const verifier = sessionStorage.getItem("verifier");
  const body = {
    slug,
    code,
    verifier,
    app,
  };
  let response = await performApiCall("account/oauth", "POST", body);
  console.log(response);
  if (response) {
    if (response.status === 200) {
      return response;
    }
  }
  return null;
}
