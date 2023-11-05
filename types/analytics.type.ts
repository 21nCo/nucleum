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
  GUAGE = "guage",
}

export type HorizonChart = {
  id: string;
  period: TimePeriod;
  type: ChartType;
  chartOptions?: any;
};
