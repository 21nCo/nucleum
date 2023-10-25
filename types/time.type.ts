export enum TimeScale {
  SINGLEDAY = "SINGLEDAY",
  DAYS = "DAYS",
  WEEKS = "WEEKS",
  MONTHS = "MONTHS",
  QUARTERS = "QUARTERS",
  YEARS = "YEARS",
}

export enum TimePeriodType {
  LASTXSEGMENTS,
  UPPERHORIZON,
}

export type TimePeriod = {
  scale: TimeScale;
  type: TimePeriodType;
  numberOfSegments: number;
  horizons: number[];
};

export enum TimeFormat {
  VERBOSE = "verbose",
  CLOCK = "clock",
}

export enum TimeUnit {
  SECONDS = "seconds",
  MINUTES = "minutes",
  HOURS = "hours",
}

export type TimeSuggestion = {
  label: string;
  value: number;
  unit: TimeUnit;
};
