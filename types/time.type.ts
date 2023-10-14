export enum TimeScale {
  SINGLEDAY,
  DAYS,
  WEEKS,
  MONTHS,
  QUARTERS,
  YEARS,
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
