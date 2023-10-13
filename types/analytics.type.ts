import type { TimePeriodSelection, TimeScale } from "./time.type";

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
