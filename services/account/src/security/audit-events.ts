import type { AuthFnEvent } from 'authfn';
import type { Logger } from '@logfn/core';
import { createSecurityLoggerSink } from '@secfn/server/audit';

type SecurityEventType =
  | 'auth_failure'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'suspicious_activity';

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
  return event.type.includes('failed')
    || event.type.includes('revoked')
    || event.type.includes('rate')
    || event.type.includes('region')
    || event.type.includes('handoff')
    || event.type.includes('otp');
}

function severityForAuthEvent(type: string): 'low' | 'medium' | 'high' | 'critical' {
  if (type.includes('handoff.failed') || type.includes('region.lookup.conflict')) {
    return 'high';
  }
  if (type.includes('failed') || type.includes('revoked')) {
    return 'medium';
  }
  return 'low';
}

function securityEventTypeForAuthEvent(type: string): SecurityEventType {
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
