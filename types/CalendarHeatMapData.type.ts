import type { TileAppearance } from "./CalendarHeatMap.enum";

export type DailyData = {
  date: string; //YYYY-MM-DD
  value: number;
  display?: TileAppearance;
  color?: string;
};

export type MonthlyData = {
  month: string; //YYYY-MM
  value: number;
  display?: TileAppearance;
  color?: string;
};

export type YearlyData = {
  year: number; //YYYY
  value: number;
  display?: TileAppearance;
  color?: string;
};
