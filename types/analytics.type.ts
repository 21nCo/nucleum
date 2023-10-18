import type { TimePeriod } from "./time.type";

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
  id: string;
  period: TimePeriod;
  chartType: ChartType;
  chartOptions?: any;
};
