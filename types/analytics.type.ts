export enum TimeScale {
  SINGLEDAY = "day",
  DAYS = "days",
  MONTHS = "months",
  YEARS = "years",
}

export type TimePeriod = {
  start: Date;
  end: Date;
};

export enum TimePeriodType {
  LASTXSEGMENTS = "lastXSegments",
  HORIZON = "horizon",
}

export type TimePeriodSelection = {
  type: TimePeriodType;
  numberOfSegments: number;
  horizons: number[];
};

export enum ChartType {
  BAR = "bar",
  LINE = "line",
  PIE = "pie",
  AREA = "area",
}

export type HorizonChart = {
  scale: TimeScale;
  periodSelection: TimePeriodSelection;
  chartType: ChartType;
};
