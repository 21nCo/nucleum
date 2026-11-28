import { oauth, processOAuthRedirection } from "./oauth";
import { buildOAuthRedirectResponse } from "./oauth-redirect";

export async function handleOauth(body: any) {
  return oauth(body);
}

/**
 * OAuth redirect handler to process the auth code received from the OAuth provider if the response type of the provider is `form_post` in cases like Apple.
 * The caller is only signed in and sent back with a token when `state` names an allowlisted client host (see `oauth-redirect.ts`).
 * @param body
 * @param provider
 * @param endpoint the API host that received the callback
 * @returns
 */
export async function handleOAuthRedirection(
  body: any,
  provider: string,
  endpoint: string
) {
  return buildOAuthRedirectResponse(
    body,
    provider,
    endpoint,
    processOAuthRedirection
  );
}
