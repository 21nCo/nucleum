export enum TimeScale {
  DAYS = "DAYS",
  WEEKS = "WEEKS",
  MONTHS = "MONTHS",
  QUARTERS = "QUARTERS",
  YEARS = "YEARS",
}

export enum TimePeriodType {
  RELATIVE,
  CALENDAR_BOUND,
  START_END,
}

export type TimePeriod = {
  scale: TimeScale;
  type: TimePeriodType;
  //relativity or calendar bounds or start/end
  value: number | number[] | { start: Date; end: Date };
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
