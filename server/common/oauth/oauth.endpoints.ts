import { oauth, processOAuthRedirection } from "./oauth";

export async function handleOauth(body: any) {
  return oauth(body);
}

/**
 * OAuth redirect handler to process the auth code received from the OAuth provider if the response type of the provider is `form_post` in cases like Apple.
 * @param body
 * @param provider
 * @param apiUrl
 * @returns
 */
export async function handleOAuthRedirection(
  body: any,
  provider: string,
  endpoint: string
) {
  let domain = "";
  try {
    const domainPart = body.state.split(":")[1];
    let isSchemeRedirect = false;
    if (domainPart) {
      if (domainPart.includes("localredirect")) {
        domain = "tauri://localhost/index.html";
      } else if (domainPart.includes("schemeredirect")) {
        isSchemeRedirect = true;
        const schemeData = domainPart.split(".")?.[0]?.split("_");
        domain = schemeData?.[1] + "://oauthsignin";
      } else {
        domain = "https://" + domainPart + "/oauth";
      }
    }
    const result = await processOAuthRedirection(body, provider, endpoint);
    console.log({ result, domainPart, domain, body });
    let redirectUrl = domain ?? "http://bla.ink";
    if (result?.token && domain) {
      redirectUrl = domain + "?token=" + result.token;
      if (!isSchemeRedirect) {
        redirectUrl =
          redirectUrl + "&provider=" + provider + "&signup=" + result.isSignup;
      }
    } else if (result?.error) {
      redirectUrl = domain + "/error?error=" + result.error;
    }
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl
      },
      body: ""
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 302,
      headers: {
        Location: domain + "/error?error=" + "Something went wrong"
      },
      body: ""
    };
  }
}
