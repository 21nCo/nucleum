import {
  fetchOAuthUserData,
  parseOAuthUserDataForApple
} from "$lib/server/common/oauth/oauth.utils";
import { OAuthUserData } from "$lib/server/common/oauth/oauth.type";
import { signup } from "$lib/server/common/account";
import { retrieveAppConfig } from "$lib/server/utils";
import { parse } from "$lib/shared/utils/json.utils";

async function signinOauthUser(oAuthUserData: OAuthUserData, context: any) {
  return signup(
    {
      email: oAuthUserData.email,
      nickName: getNickName(),
      profilePictureUrl: oAuthUserData.picture,
      sub: oAuthUserData.sub,
      context: { ...context, oauthData: oAuthUserData },
      isTrusted: true
    },
    true
  );
  function getNickName() {
    if (oAuthUserData.name) {
      return oAuthUserData.name;
    }
    if (oAuthUserData.firstName && oAuthUserData.lastName) {
      return oAuthUserData.firstName + " " + oAuthUserData.lastName;
    }
    return oAuthUserData.given_name || "";
  }
}

/**
 * Processes the OAuth response (auth code) received from the OAuth provider, determines the user details using futher id API call or parsing the id_token and signs in or signs up the user.
 * @param body code: auth code received from the provider, app, slug, context
 * @returns user details and token
 */
export async function oauth(body: any) {
  try {
    const { code, app, slug, context } = body;
    console.log({ code, app, slug });
    if (!code || !app || !slug)
      return { error: "code, app and slug are required" };
    let config;
    let appDataJson = await retrieveAppConfig(app);
    config = appDataJson?.oAuthConfig?.find((c) => c.oauth_slug === slug);
    if (!config) {
      return { error: "Unknown provider" };
    }
    const redirectUri = context.href.split("?")[0];
    if (!code) return { error: "code is required" };
    if (!redirectUri) return { error: "Unable to resolve Redirect URL" };
    const oAuthUserData = await fetchOAuthUserData(config, code, redirectUri);
    if (
      config.oauth_slug === "google" ||
      (config.oauth_slug === "apple" && oAuthUserData)
    ) {
      return await signinOauthUser(oAuthUserData, context);
    }
  } catch (e) {
    console.error(e);
    return { status: "error", error: e };
  }
}

export async function processOAuthRedirection(
  body: any,
  provider: string,
  apiUrl: string
) {
  let app = "";
  if (!body.state) return;
  const guestPart = body.state.split(":")[0];
  const domainPart = body.state.split(":")[1];
  if (
    domainPart.includes("localredirect.") ||
    domainPart.includes("schemeredirect.")
  ) {
    app = domainPart.split("redirect.")[1];
  } else {
    app = domainPart;
  }
  const context = {
    href: "https://" + apiUrl + "/oauth/" + provider,
    state: body.state,
    host: domainPart,
    guest: guestPart,
    app
  };
  if (provider === "apple" && (body.id_token || body.user)) {
    if (body.user && typeof body.user === "string")
      body.user = parse(body.user);
    const oAuthUserData = parseOAuthUserDataForApple(body);
    if (!oAuthUserData?.email)
      return {
        provider,
        status: "error",
        error: "Unable to parse Apple user data"
      };
    return await signinOauthUser(oAuthUserData, context);
  } else if (body.code) {
    return oauth({
      code: body.code,
      app,
      slug: provider,
      context
    });
  }
}
