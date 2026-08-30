import type { AuthFnEvent } from 'authfn';
import type { Logger } from '@logfn/core';
import { createSecurityLoggerSink } from '@secfn/server/audit';

type SecurityEventType =
  | 'auth_failure'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'suspicious_activity';

const SECURITY_EVENT_TYPES = new Set<AuthFnEvent['type']>([
  'authfn.account_linking.conflict',
  'authfn.password.signup.rollback_failed',
  'authfn.session.revoked',
  'authfn.otp.signup.rollback_failed',
  'authfn.oauth.failed',
  'authfn.api_key.revoked',
  'authfn.2fa.challenged',
  'authfn.region.lookup.conflict',
  'authfn.routing.mismatch',
  'authfn.routing.assertion_rejected',
  'authfn.handoff.failed',
  'authfn.rate_limited',
  'authfn.request.failed',
  'authfn.plugin.failed'
]);

const HIGH_SEVERITY_EVENT_TYPES = new Set<AuthFnEvent['type']>([
  'authfn.account_linking.conflict',
  'authfn.region.lookup.conflict',
  'authfn.routing.mismatch',
  'authfn.routing.assertion_rejected',
  'authfn.handoff.failed'
]);

export type AccountSecurityAuditSink = (
  event: AuthFnEvent
) => Promise<void> | void;

export function createAccountSecurityAuditSink(logger: Logger): AccountSecurityAuditSink {
  const secfnSink = createSecurityLoggerSink(logger);

  return async (event: AuthFnEvent): Promise<void> => {
    if (!isAuthFnSecurityEvent(event)) {
      return;
    }

    await secfnSink({
      id: `${event.requestId}:${event.type}`,
      timestamp: new Date().toISOString(),
      type: securityEventTypeForAuthEvent(event.type),
      severity: severityForAuthEvent(event.type),
      actorId: event.actorId,
      resource: 'authfn',
      action: event.outcome ?? event.type,
      requestId: event.requestId,
      metadata: event.metadata ?? {},
      resolved: false
    });
  };
}

export function isAuthFnSecurityEvent(event: AuthFnEvent): boolean {
  return SECURITY_EVENT_TYPES.has(event.type);
}

function severityForAuthEvent(
  type: AuthFnEvent['type']
): 'low' | 'medium' | 'high' | 'critical' {
  if (HIGH_SEVERITY_EVENT_TYPES.has(type)) {
    return 'high';
  }
  if (type.includes('failed') || type.includes('revoked')) {
    return 'medium';
  }
  return 'low';
}

function securityEventTypeForAuthEvent(
  type: AuthFnEvent['type']
): SecurityEventType {
  if (type.includes('rate')) {
    return 'rate_limit_exceeded';
  }
  if (type.includes('failed')) {
    return 'auth_failure';
  }
  if (type.includes('revoked')) {
    return 'unauthorized_access';
  }
  return 'suspicious_activity';
}
