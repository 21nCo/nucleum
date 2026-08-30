import type { AuthFnEvent } from "authfn";
import type { DataFnEvent } from "@datafn/server";
import type { Logger } from "@logfn/core";
import {
  createObservability,
  type ObservationEvent,
  type ObservationLogger,
  type RequestObservationContext,
  type SuperfunctionObservability
} from "@superfunctions/observability";
import { sendAccountDebugLog } from "../debug-sink.js";
import {
  createAccountSecurityAuditSink,
  isAuthFnSecurityEvent
} from "../security/audit-events.js";

export type AccountObservationEvent =
  | AuthFnEvent
  | DataFnEvent
  | ObservationEvent<"account">;

export type AccountEventSink = (
  event: AccountObservationEvent
) => Promise<void> | void;

export interface AccountObservabilityOptions {
  requestContext?: RequestObservationContext<AccountObservationEvent>;
}

export function createAccountObservability(
  logger: Logger,
  sink?: AccountEventSink,
  options: AccountObservabilityOptions = {}
): SuperfunctionObservability<AccountObservationEvent> {
  const defaultSink = createAccountEventSink(logger);
  return createObservability<AccountObservationEvent>({
    service: "nucleus-account",
    logger: createObservationLogger(logger),
    events: sink
      ? async (event) => {
          await defaultSink(event);
          await sink(event);
        }
      : defaultSink,
    requestContext: options.requestContext
  });
}

export function createAccountEventSink(logger: Logger): AccountEventSink {
  const securityAuditSink = createAccountSecurityAuditSink(logger);

  return async (event: AccountObservationEvent): Promise<void> => {
    const securityRelevant = isSecurityRelevant(event);
    const debugPayload = {
      domain: event.domain,
      type: event.type,
      requestId: event.requestId,
      userId: event.userId,
      actorId: event.actorId,
      outcome: event.outcome,
      metadata: event.metadata
    };

    sendAccountDebugLog({
      level: securityRelevant
        ? "warn"
        : event.severity === "error"
          ? "error"
          : "info",
      message: `${event.domain} event`,
      payload: debugPayload,
      requestId: event.requestId,
      userId: event.userId,
      tags: [event.domain, event.type]
    });

    if (isAuthFnEvent(event) && isAuthFnSecurityEvent(event)) {
      await securityAuditSink(event);
    }
  };
}

function isAuthFnEvent(event: AccountObservationEvent): event is AuthFnEvent {
  return event.domain === "authfn";
}

function isSecurityRelevant(event: AccountObservationEvent): boolean {
  if (isAuthFnEvent(event)) {
    return isAuthFnSecurityEvent(event);
  }
  return event.severity === "warn" || event.severity === "error";
}

function createObservationLogger(logger: Logger): ObservationLogger {
  return {
    debug: (message, context) => logger.debug(message, context),
    info: (message, context) => logger.info(message, context),
    warn: (message, context) => logger.warn(message, context),
    error: (message, context) => logger.error(message, context)
  };
}
