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

export enum ChartType {
  LINE = "line",
  PIE = "pie",
  BAR = "bar",
  AREA = "area",
  DOUGHNUT = "doughnut",
  TREEMAP = "treemap",
  CALENDARHEATMAP = "calendarheatmap",
  STACKEDBAR = "stackedbar",
  STACKEDAREA = "stackedarea",
}

export type HorizonChart = {
  scale: TimeScale;
  periodSelection: TimePeriodSelection;
  chartType: ChartType;
  chartOptions?: any;
};
