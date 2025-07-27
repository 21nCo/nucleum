import type { TimePeriod } from "$lib/client/types/time.type";

export type IAnalyticsConfigStore = {
  pages: AnalyticsPage[];
};
export type AnalyticsPage = {
  id: string;
  label: string;
  cards: IAnalyticsCard[];
};

export type IAnalyticsCard = {
  id: string;
  label?: string;
  /**
   * @deprecated
   */
  grouping?: AnalyticsCardGrouping;
  /**
   * @deprecated
   */
  filter?: string[];
  type: AnalyticsCardType;
  period: TimePeriod;
  isGroupByTopLevelGoals?: boolean;
};

export enum AnalyticsCardGrouping {
  DEFAULT = "DEFAULT",
  TOP_LEVEL_GOALS = "TOP_LEVEL_GOALS",
  /**
   * @deprecated
   */
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

export type IAnalyticsLabelColor = {
  label: string;
  color: number;
};
