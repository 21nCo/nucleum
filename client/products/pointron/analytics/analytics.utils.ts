import {
  TimePeriodType,
  TimeScale,
  type TimePeriod
} from "$lib/client/types/time.type";
import { deepCopy } from "$lib/shared/utils/obj.utils";
import {
  determinePreviousTimePeriod,
  determineTimePeriod,
  determineTimePeriodv2
} from "$lib/client/utils/time.utils";
import { generateUID } from "$lib/client/utils/utils";
import {
  AnalyticsCardGrouping,
  AnalyticsCardType,
  type AnalyticsCard
} from "./analytics.types";

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

export function generateAnalyticsSeedPages() {
  const page1 = {
    id: generateUID(),
    label: "Overview",
    cards: [
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.TOP_LEVEL_GOALS,
        filter: [],
        type: AnalyticsCardType.TOP_N,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -7
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.TOP_LEVEL_GOALS,
        filter: [],
        type: AnalyticsCardType.TARGETS,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -7
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.BAR,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -14
          }
        }
      }
    ]
  };
  const page2 = {
    id: generateUID(),
    label: "Days",
    cards: [
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.METRICS,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -1
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -30
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.BAR,
        period: {
          scale: TimeScale.DAYS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -14
          }
        }
      }
    ]
  };
  const page3 = {
    id: generateUID(),
    label: "Months",
    cards: [
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.METRICS,
        period: {
          scale: TimeScale.MONTHS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.MONTHS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.MONTHS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -1
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.MONTHS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -3
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.BAR,
        period: {
          scale: TimeScale.MONTHS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -12
          }
        }
      }
    ]
  };
  const page4 = {
    id: generateUID(),
    label: "Years",
    cards: [
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.METRICS,
        period: {
          scale: TimeScale.YEARS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.YEARS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: 0
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.DONUT,
        period: {
          scale: TimeScale.YEARS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -1
          }
        }
      },
      {
        id: generateUID(),
        grouping: AnalyticsCardGrouping.DEFAULT,
        filter: [],
        type: AnalyticsCardType.BAR,
        period: {
          scale: TimeScale.YEARS,
          value: {
            type: TimePeriodType.RELATIVE,
            param: -3
          }
        }
      }
    ]
  };
  return deepCopy([page1, page2, page3, page4]);
}
