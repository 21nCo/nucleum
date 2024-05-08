import { goto } from "$app/navigation";
import { get } from "svelte/store";
import { appStore } from "../stores/app.store";
import type {
  IdentityProvider,
  OAuthProviderConfig
} from "../types/oauth.type";
import { openLink, performApiCall } from "./utils";
import context from "../stores/context.store";

export function initiateOAuth2Flow(provider: IdentityProvider) {
  const ctx = get(context);
  const oAuthConfig: OAuthProviderConfig[] = get(appStore).appData?.oAuthConfig;
  console.log(oAuthConfig, window.location);
  if (!oAuthConfig || oAuthConfig.length < 1) return;
  const config = oAuthConfig.find((c) => c.provider === provider);
  if (!config) return;
  const app = import.meta.env.VITE_APP ?? window.location.hostname;
  let url =
    config.authorise_url +
    "?client_id=" +
    config.client_id +
    "&scope=" +
    config.scope +
    "&response_type=code&state=" +
    app;
  let redirectUri = "";
  if (config.response_mode === "form_post") {
    redirectUri = import.meta.env.VITE_API_URL + "/oauth/" + config.oauth_slug;
    // redirectUri = "https://dev.pointron.io/r/apple";
    url += "&response_mode=form_post";
  } else if (!ctx.isEmbed) {
    redirectUri = window.location.origin + "/r/" + config.oauth_slug;
  } else {
    redirectUri =
      "https://" + import.meta.env.VITE_APP + "/r/" + config.oauth_slug;
  }
  if (config.code_challenge_method) {
    //TODO generate code challenge
    url +=
      "&code_challenge=challenge&code_challenge_method=" +
      config.code_challenge_method;
  }
  if (!redirectUri) return;
  url += "&redirect_uri=" + redirectUri;
  // url += "&redirect_uri=" + encodeURIComponent(redirectUri);
  if (ctx.isEmbed) {
    openLink(url);
  } else {
    goto(url);
  }
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
    app
  };
  let response = await performApiCall("account/n/oauth", "POST", body);
  console.log(response);
  if (response) {
    if (response.status === 200) {
      return response;
    }
  }
  return null;
}
