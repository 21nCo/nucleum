import { Logger, type LogEvent } from '@logfn/core';

export interface CapturedLogger {
  logger: Logger;
  events(): LogEvent[];
  clear(): void;
}

export function createCapturedLogger(name = 'nucleus-account-test'): CapturedLogger {
  const events: LogEvent[] = [];
  const logger = new Logger({
    name,
    level: 'debug',
    sinks: [
      (batch) => {
        events.push(...batch);
      }
    ]
  });

  return {
    logger,
    events() {
      return events.map((event) => ({ ...event }));
    },
    clear() {
      events.length = 0;
    }
  };
}
