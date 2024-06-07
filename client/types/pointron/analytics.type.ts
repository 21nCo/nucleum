export type AnalyticsFilters = {
  goals: string[];
  tags: string[];
  isAggregateSubgoals: boolean;
  isShowTargetLines: boolean;
};

/**
 * @deprecated Use `AnalyticsChartRawDataRecord` instead.
 */
export type HorizonChartDataRecord = {
  brek: number;
  focus: number;
  goal: string;
  goalId: string;
  start: string;
  topLevelGoal: string;
};
