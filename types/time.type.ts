export enum TimeScale {
  SINGLEDAY = "day",
  DAYS = "days",
  MONTHS = "months",
  YEARS = "years",
}

export enum TimePeriodType {
  LASTXSEGMENTS = "lastXSegments",
  HORIZON = "horizon",
}

export type TimePeriodSelection = {
  type: TimePeriodType;
  numberOfSegments: number;
  horizons: number[];
};

export enum TimeFormat {
  VERBOSE = "verbose",
  CLOCK = "clock",
}
