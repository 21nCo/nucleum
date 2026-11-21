import { authFnPlugins } from 'authfn';
import { authFnApiKeyPlugin } from '@authfn/api-keys';
import { authFnEmailOtpPlugin } from '@authfn/email-otp';
import { authFnMultiRegionPlugin } from '@authfn/multi-region';
import { authFnNativeHandoffPlugin } from '@authfn/native-handoff';
import { authFnPasswordPlugin } from '@authfn/password';
import { authFnSocialOAuthPlugin } from '@authfn/social-oauth';
import { authFnTwoFactorPlugin } from '@authfn/two-factor';
import { nucleusLifecyclePlugin } from '../plugins/nucleus-lifecycle.js';
import { nucleusWidgetTokenPlugin } from '../plugins/widget-token.js';

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Sign-in policy for social OAuth: web return targets never receive a session
 * token, and native apps that send a challenge receive a one-time code they
 * exchange with their verifier.
 *
 * Browser binding (a callback completes only in the browser that started the
 * sign-in) stays off for now: native builds already installed open the
 * provider in a separate browser session and send no challenge, so binding
 * would refuse their callbacks.
 *
 * TODO(TIDY-640): set `bindBrowserState: true` once a native release that
 * sends a handoff challenge is the minimum supported version.
 */
export const ACCOUNT_SOCIAL_OAUTH_POLICY = {
  bindBrowserState: false,
  allowWebSessionTokenHandoff: false
} as const;

/**
 * Personal access token policy: creating one needs a sign-in from the last 15
 * minutes; tokens last at most a year (Account settings offers 7 to 365 days)
 * and 90 days when no expiry is given.
 */
export const ACCOUNT_API_KEY_POLICY = {
  recentAuthenticationSeconds: 15 * 60,
  defaultExpiresInSeconds: 90 * DAY_SECONDS,
  maxExpiresInSeconds: 366 * DAY_SECONDS
} as const;

/**
 * Native-to-web handoff is not used by the apps, so its web start and consume
 * routes stay unregistered.
 */
export const ACCOUNT_NATIVE_HANDOFF_POLICY = { webHandoff: false } as const;

/**
 * Creates account-service AuthFn declaration plugins for schema and route registration.
 */
export function createAccountAuthPlugins(options: { regionIds?: string[] } = {}) {
  return authFnPlugins(
    authFnPasswordPlugin(),
    authFnEmailOtpPlugin(),
    authFnSocialOAuthPlugin(ACCOUNT_SOCIAL_OAUTH_POLICY),
    authFnTwoFactorPlugin(),
    authFnApiKeyPlugin(ACCOUNT_API_KEY_POLICY),
    authFnMultiRegionPlugin(),
    authFnNativeHandoffPlugin(ACCOUNT_NATIVE_HANDOFF_POLICY),
    nucleusLifecyclePlugin({ regionIds: options.regionIds }),
    nucleusWidgetTokenPlugin()
  );
}
