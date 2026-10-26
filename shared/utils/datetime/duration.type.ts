/** Defines time format. */
export enum TimeFormat {
  /**
   * For formats like 2h 15m 30s, 1h 30m, 45m 30s
   */
  VERBOSE = "verbose",
  /**
   * For formats like 02:15:30, 01:30:00, 45:30:00
   */
  CLOCK = "clock",
  /**
   * For formats like 2.4h, 1.5m, 30s
   */
  DECIMALS = "decimals"
}

/** Defines time unit. */
export enum TimeUnit {
  SECONDS = "seconds",
  MINUTES = "minutes",
  HOURS = "hours"
}

/** Defines time suggestion. */
export type TimeSuggestion = {
  label: string;
  value: number;
  unit: TimeUnit;
};
