import type { Context, Next } from "hono";
import { runObservedRequest } from "@superfunctions/http";
import type {
  RequestObservationSnapshot,
  SuperfunctionObservability
} from "@superfunctions/observability";
import {
  readObservationGroup,
  roundObservationMs
} from "@superfunctions/observability";
import type { Logger } from "@logfn/core";
import type { AccountObservationEvent } from "../observability/events.js";

export interface AccountRequestObservationOptions {
  observability: SuperfunctionObservability<AccountObservationEvent>;
  logger: Logger;
  regionId: string;
  workerColo?: string;
  sendDebugLog(input: {
    level: "info" | "warn" | "error";
    route: string;
    message: string;
    payload: Record<string, unknown>;
    requestId?: string;
    tags: string[];
  }): void | Promise<void>;
}

/** Creates account-service request observation, latency headers, and request logging middleware. */
export function createAccountRequestObservationMiddleware(
  options: AccountRequestObservationOptions
) {
  return async (c: Context, next: Next): Promise<void> => {
    const labels = {
      regionId: options.regionId,
      ...(options.workerColo ? { workerColo: options.workerColo } : {})
    };
    await runObservedRequest({
      observability: options.observability,
      request: c.req.raw,
      labels,
      status: () => c.res.status,
      responseHeaders: () => c.res.headers,
      serverTiming: {
        groups: {
          db: "db",
          cache: "cache",
          lookup: "lookup"
        }
      },
      headers: {
        prefix: "x-account",
        groups: ["db", "cache", "lookup"]
      },
      work: next,
      onComplete: async ({ request, snapshot }) => {
        const path = new URL(request.url).pathname;
        const dbGroup = readObservationGroup(snapshot, "db");
        const cacheGroup = readObservationGroup(snapshot, "cache");
        const lookupGroup = readObservationGroup(snapshot, "lookup");
        const durationMs = snapshot.totalDurationMs;
        c.res.headers.set("x-account-region", options.regionId);
        if (options.workerColo) {
          c.res.headers.set("x-account-worker-colo", options.workerColo);
        }
        options.logger.info("account request", {
          method: request.method,
          path,
          status: c.res.status,
          durationMs,
          regionId: options.regionId,
          dbCallCount: dbGroup.count,
          dbDurationMs: dbGroup.durationMs,
          dbMaxDurationMs: dbGroup.maxDurationMs,
          cacheCallCount: cacheGroup.count,
          cacheDurationMs: cacheGroup.durationMs,
          lookupCallCount: lookupGroup.count,
          lookupDurationMs: lookupGroup.durationMs,
          workerColo: options.workerColo
        });
        if (
          c.res.status >= 400 ||
          path.includes("/auth/social/callback/") ||
          process.env.ACCOUNT_LATENCY_DEBUG === "true"
        ) {
          await options.sendDebugLog({
            level:
              c.res.status >= 500
                ? "error"
                : c.res.status >= 400
                  ? "warn"
                  : "info",
            route: path,
            message: "account request",
            payload: {
              method: request.method,
              path,
              status: c.res.status,
              durationMs,
              regionId: options.regionId,
              latency:
                process.env.ACCOUNT_LATENCY_DEBUG === "true"
                  ? redactLatencyDetails(snapshot)
                  : {
                      dbCallCount: dbGroup.count,
                      dbDurationMs: round(dbGroup.durationMs),
                      dbMaxDurationMs: round(dbGroup.maxDurationMs),
                      cacheCallCount: cacheGroup.count,
                      cacheDurationMs: round(cacheGroup.durationMs),
                      lookupCallCount: lookupGroup.count,
                      lookupDurationMs: round(lookupGroup.durationMs)
                    },
              workerColo: options.workerColo
            },
            requestId: request.headers.get("x-request-id") ?? undefined,
            tags: ["account-request"]
          });
        }
      }
    });
  };
}

function redactLatencyDetails(
  latency: RequestObservationSnapshot
): RequestObservationSnapshot {
  return {
    ...latency,
    totalDurationMs: round(latency.totalDurationMs),
    groups: Object.fromEntries(
      Object.entries(latency.groups).map(([kind, group]) => [
        kind,
        {
          ...group,
          durationMs: round(group.durationMs),
          maxDurationMs: round(group.maxDurationMs)
        }
      ])
    ),
    metrics: latency.metrics.map((metric) => ({
      ...metric,
      durationMs:
        typeof metric.durationMs === "number"
          ? round(metric.durationMs)
          : metric.durationMs
    }))
  };
}

function round(value: number): number {
  return roundObservationMs(value);
}
