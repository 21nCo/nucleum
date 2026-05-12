import { createSecurityLoggerSink } from '@secfn/server/audit';
import type { AuthFnEvent } from '@authfn/core';
import type { Logger } from 'logfn';
import { sendAccountDebugLog } from '../debug-sink.js';

type SecurityEventType =
  | 'auth_failure'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'suspicious_activity';

export function createAuthSecurityEmitter(logger: Logger) {
  const secfnSink = createSecurityLoggerSink(logger);

  return async (event: AuthFnEvent): Promise<void> => {
    const debugPayload = {
      type: event.type,
      requestId: event.requestId,
      userId: event.userId,
      actorId: event.actorId,
      regionId: event.regionId,
      outcome: event.outcome,
      metadata: event.metadata
    };

    logger.info('authfn event', {
      ...debugPayload
    });

    sendAccountDebugLog({
      level: isSecurityRelevant(event.type) ? 'warn' : 'info',
      message: 'authfn event',
      payload: debugPayload,
      requestId: event.requestId,
      tags: ['authfn', event.type]
    });

    if (isSecurityRelevant(event.type)) {
      await secfnSink({
        id: `${event.requestId}:${event.type}`,
        timestamp: new Date().toISOString(),
        type: securityEventTypeForAuthEvent(event.type),
        severity: severityForEvent(event.type),
        actorId: event.actorId,
        resource: 'authfn',
        action: event.outcome ?? event.type,
        requestId: event.requestId,
        metadata: event.metadata ?? {},
        resolved: false
      });
    }
  };
}

function isSecurityRelevant(type: string): boolean {
  return type.includes('failed')
    || type.includes('revoked')
    || type.includes('rate')
    || type.includes('region')
    || type.includes('handoff')
    || type.includes('otp');
}

function severityForEvent(type: string): 'low' | 'medium' | 'high' | 'critical' {
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
