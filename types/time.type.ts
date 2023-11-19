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
  value: TimePeriodValue;
};

export type TimePeriodValue =
  | { type: TimePeriodType.RELATIVE; param: number }
  | { type: TimePeriodType.CALENDAR_BOUND; param: number[] }
  | { type: TimePeriodType.START_END; param: { start: Date; end: Date } };

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
