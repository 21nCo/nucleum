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

/**
 * Creates account-service AuthFn declaration plugins for schema and route registration.
 */
export function createAccountAuthPlugins() {
  return authFnPlugins(
    authFnPasswordPlugin(),
    authFnEmailOtpPlugin(),
    authFnSocialOAuthPlugin(),
    authFnTwoFactorPlugin(),
    authFnApiKeyPlugin(),
    authFnMultiRegionPlugin(),
    authFnNativeHandoffPlugin(),
    nucleusLifecyclePlugin(),
    nucleusWidgetTokenPlugin()
  );
}
