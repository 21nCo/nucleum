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
import { get } from "svelte/store";
import { analyticsConfigStore, selectedPageId } from "./analytics.store";
import {
  AnalyticsCardGrouping,
  AnalyticsCardType,
  type AnalyticsPage,
  type AnalyticsCard
} from "./analytics.types";

export function onAddPageClicked() {
  analyticsConfigStore.addPage();
}
export function onRemovePageClicked(e: CustomEvent<string>) {
  const id = e.detail;
  if (id == get(selectedPageId)) {
    const pages = get(analyticsConfigStore).pages;
    const index = pages.findIndex((page) => page.id !== id);
    if (index !== -1) {
      let event = new CustomEvent("pageSwitch", {
        detail: pages[index]?.id
      });
      onPageSwitch(event);
    } else selectedPageId.set(null);
  }
  analyticsConfigStore.removePage(e.detail);
}
export function onPageSwitch(e: CustomEvent<string>) {
  selectedPageId.set(
    get(analyticsConfigStore).pages.find((page) => page.id === e.detail)
      ?.id as string
  );
}
export function onPagelabelChange(
  e: CustomEvent<{ value: string; label: string }>
) {
  if (!e.detail.label || !e.detail.value) return;
  analyticsConfigStore.editPageLabel(e.detail.value, e.detail.label);
}

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

export function generateAnalyticsSeedPage(): AnalyticsPage {
  return {
    id: generateUID(),
    label: "New view",
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
        grouping: AnalyticsCardGrouping.DEFAULT,
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
}
