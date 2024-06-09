import type { TimePeriod } from "$lib/client/types/time.type";
import {
  determinePreviousTimePeriod,
  determineTimePeriod,
  determineTimePeriodv2
} from "$lib/client/utils/time.utils";
import { AnalyticsCardType, type AnalyticsCard } from "./analytics.types";

/**
 * @deprecated - Use generateParamsForCards instead
 * @param timePeriods
 * @returns
 */
export function generateParamsForCharts(timePeriods: TimePeriod[]) {
  let params: any[] = [];
  timePeriods.forEach((period) => {
    let dates = determineTimePeriod(period);
    params.push({
      begin: dates.begin.toISOString(),
      end: dates.end.toISOString(),
      scale: period.scale
    });
  });
  return params;
}

export function generateParamsForCards(cards: AnalyticsCard[]) {
  let params: any[] = [];
  cards.forEach((card) => {
    let dates = determineTimePeriodv2(card.period);
    let previous =
      card.type === AnalyticsCardType.TOP_N ||
      card.type === AnalyticsCardType.METRICS
        ? determinePreviousTimePeriod(card.period)
        : undefined;
    params.push({
      begin: dates.begin.toISOString(),
      end: dates.end.toISOString(),
      scale: card.period.scale,
      previous
    });
  });
  return params;
}
