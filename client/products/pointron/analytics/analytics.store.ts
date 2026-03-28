import { get, writable } from "svelte/store";
import {
  AnalyticsCardGrouping,
  type IAnalyticsConfigStore,
  type AnalyticsPageStore,
  type AnalyticsPage,
  type IAnalyticsCard,
  AnalyticsCardType
} from "@21n/products/pointron/analytics/analytics.types";
import { TimePeriodType, TimeScale } from "@21n/types/time.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import {
  generateAnalyticsSeedPage,
  generateAnalyticsSeedPages,
  generateParamsForCards
} from "@21n/products/pointron/analytics/analytics.utils";
import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { sessionLogStore } from "@21n/products/pointron/logs/log.store";
import type { IRecordId } from "@21n/types/data.type";
import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
import { tzStore } from "@21n/components/settings/timezone/tz.store";
import { toasts } from "@21n/stores/notification.store";

type IFocusLogAggregate = {
  goalId?: IRecordId;
  focus: number;
};

export const selectedPageId = writable<string | undefined>();
const analyticsConfigStoreId = Resource.pointAnalyticsConfig;

const seedAnalyticsConfig: IAnalyticsConfigStore = {
  pages: generateAnalyticsSeedPages()
};

class AnalyticsConfigStore extends KeyValueStore<IAnalyticsConfigStore> {
  constructor() {
    super(Resource.pointAnalyticsConfig, { ...seedAnalyticsConfig });
  }

  reset() {
    const val = {
      ...seedAnalyticsConfig,
      pages: [generateAnalyticsSeedPage()]
    };
    return this.modify(val);
  }

  loader(data: IAnalyticsConfigStore) {
    if (data.pages.length === 0) {
      this.loadSeedData();
    } else {
      const val = { ...data, id: analyticsConfigStoreId };
      this.modify(val, { isPersist: false });
    }
  }

  updateCardConfig(pageId: string, config: IAnalyticsCard) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === pageId);
    if (!page) return;
    const chart = page.cards.find((c) => c.id === config.id);
    if (!chart) return;
    Object.assign(chart, config);
    this.modify(state);
  }

  removeCard(pageId: string, chartId: string) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === pageId);
    if (!page) return;
    const index = page.cards.findIndex((c) => c.id === chartId);
    if (index > -1) {
      page.cards.splice(index, 1);
    }
    this.modify(state);
  }

  addCard(pageId: string) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === pageId);
    if (!page) return;
    if (page.cards.length >= 10) {
      toasts.error("You can only have up to 10 cards on a page");
      return;
    }
    page.cards.push({
      id: generateSimpleRandomId(),
      type: AnalyticsCardType.PIE,
      period: {
        scale: TimeScale.DAYS,
        value: {
          type: TimePeriodType.RELATIVE,
          param: 0
        }
      }
    });
    this.modify(state);
  }

  addPage() {
    let state = this.get();
    const newPage = generateAnalyticsSeedPage();
    state.pages.push({ ...newPage, id: generateSimpleRandomId() });
    this.modify(state);
  }

  editPageLabel(id: string, label: string) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === id);
    if (!page) return;
    page.label = label;
    this.modify(state);
  }

  removePage(id: string) {
    let state = this.get();
    const index = state.pages.findIndex((p) => p.id === id);
    if (index > -1) {
      state.pages.splice(index, 1);
    }
    this.modify(state);
  }

  rearrangePages(ids: string[]) {
    let state = this.get();
    state.pages = ids
      .map((id) => state.pages.find((p) => p.id === id))
      .filter((page): page is AnalyticsPage => Boolean(page));
    this.modify(state);
  }
}

// export const analyticsConfigStore = initAnalyticsConfigStore();
export const analyticsConfigStore = AnalyticsConfigStore.resolve(
  analyticsConfigStoreId
);

class FocusAggregates {
  /**
   *
   * @param params
   * @returns
   */
  async aggregateFocusForCurrentDay(params: {
    goalIds?: IRecordId[];
    goalId?: IRecordId;
  }) {
    const dayFilter = tzStore.resolveTimePeriodFilterForDay(new Date());
    const logs = await sessionLogStore.selectMany({
      filters: {
        startUnix: dayFilter,
        goalId: params.goalIds ?? params.goalId?.toString()
      }
    });
    if (!logs) return 0;
    const focusLogs = logs as IFocusLogAggregate[];
    if (params.goalIds) {
      let data: {
        id: IRecordId;
        focus: number;
      }[] = [];
      params.goalIds.forEach((goalId) => {
        const goalLogs = focusLogs.filter((log: IFocusLogAggregate) =>
          log.goalId ? isSameResource(log.goalId, goalId) : false
        );
        const focus = goalLogs.reduce(
          (acc: number, log: IFocusLogAggregate) => acc + log.focus,
          0
        );
        data.push({
          id: goalId,
          focus
        });
      });
      return data;
    } else {
      return focusLogs.reduce(
        (acc: number, log: IFocusLogAggregate) => acc + log.focus,
        0
      );
    }
  }
}

export const focusAggregates = new FocusAggregates();
