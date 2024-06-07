import type { ICacheableStore } from "$lib/client/types/data.type";
import type { TimePeriod } from "$lib/client/types/time.type";

export type AnalyticsConfigStore = ICacheableStore & {
  pages: AnalyticsPage[];
  isIncludeBreakInAnalytics: boolean;
};

export type AnalyticsPage = {
  id: string;
  label: string;
  cards: AnalyticsCard[];
};

export type AnalyticsCard = {
  id: string;
  label?: string;
  grouping: AnalyticsCardGrouping;
  filter: string[];
  type: AnalyticsCardType;
  period: TimePeriod;
};

export enum AnalyticsCardGrouping {
  DEFAULT = "DEFAULT",
  TOP_LEVEL_GOALS = "TOP_LEVEL_GOALS",
  TAGS = "TAGS"
}

export type AnalyticsPageStore = {
  id: string;
  config: AnalyticsPage;
  isRefreshing: boolean;
  data: { cards: any; colors: any; previous: any };
};

export enum AnalyticsCardType {
  PIE = "pie",
  DONUT = "donut",
  BAR = "bar",
  LINE = "line",
  AREA = "area",
  TOP_N = "top_n",
  TARGETS = "targets",
  METRICS = "metrics"
}

export type AnalyticsDataRecord = {
  brek: number;
  focus: number;
  goal: string;
  goalId: string;
  start: string;
  topLevelGoal: string;
};

export type ChartDataRecord = {
  group: string;
  value: number;
  key: string;
};

export type TopNCardDataRecord = {
  label: string;
  value: number;
  previousValue: number;
  color: number;
};
