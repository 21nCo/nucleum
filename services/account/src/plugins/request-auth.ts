import type { AuthFnPluginRuntimeContext, AuthFnSession } from 'authfn';
import { assertValidCsrf, authenticateSessionToken, getCookieSessionState } from 'authfn/core/sessions';

/**
 * Authenticates a state-changing Nucleus account request. A bearer token in
 * the Authorization header is used when present (it is not sent ambiently, so
 * no CSRF check applies). Otherwise a cookie session must pass the AuthFn CSRF
 * check.
 */
export async function authenticateAccountMutation(
  ctx: AuthFnPluginRuntimeContext,
  request: Request
): Promise<AuthFnSession | null> {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const bearer = /^bearer\s+(\S+)$/i.exec(authorization)?.[1];
  if (bearer) {
    return authenticateSessionToken(ctx.config, bearer, request);
  }
  const cookieState = await getCookieSessionState(ctx.config, request);
  if (cookieState.session) {
    assertValidCsrf(request, cookieState);
    return cookieState.session;
  }
  return null;
}
