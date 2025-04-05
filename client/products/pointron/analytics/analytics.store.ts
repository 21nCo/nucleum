import { get, writable } from "svelte/store";
import {
  AnalyticsCardGrouping,
  type IAnalyticsConfigStore,
  type AnalyticsPageStore,
  type AnalyticsPage,
  type IAnalyticsCard,
  AnalyticsCardType
} from "./analytics.types";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import {
  generateAnalyticsSeedPage,
  generateAnalyticsSeedPages,
  generateParamsForCards
} from "./analytics.utils";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import { sessionLogStore } from "../logs/log.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
import { getTimePeriodFilterForDay } from "$lib/client/elements/datetime/datetime.utils";

export const selectedPageId = writable<string>();
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
    state.pages = ids.map((id) => state.pages.find((p) => p.id === id));
    this.modify(state);
  }
}

// export const analyticsConfigStore = initAnalyticsConfigStore();
export const analyticsConfigStore = new AnalyticsConfigStore();

export type AnalyticsPageStoreType = ReturnType<typeof initAnalyticsPageStore>;

/**
 * Analytics page store map for analytics pages
 */
const activeAnalyticsPageStores = new Map<string, AnalyticsPageStoreType>();

/**
 * @deprecated
 * Resolves the analytics page for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the analytics page
 * @returns The active analytics page store
 */
export function resolveAnalyticsPageStore(config: AnalyticsPage | string) {
  if (typeof config === "string") {
    return activeAnalyticsPageStores.get(config)!;
  }
  if (!activeAnalyticsPageStores.has(config.id)) {
    activeAnalyticsPageStores.set(config.id, initAnalyticsPageStore(config));
  }
  let val = activeAnalyticsPageStores.get(config.id);
  return val!;
}

function initAnalyticsPageStore(config: AnalyticsPage) {
  let id = config.id;
  const { subscribe, set, update } = writable<AnalyticsPageStore>({
    id: config.id,
    config,
    data: null
  });
  return {
    subscribe,
    update,
    reset: () => {},
    refresh: async () => {
      update((n) => {
        return { ...n, isRefreshing: true };
      });
      const config = get(analyticsConfigStore).pages.find((p) => p.id === id);
      if (!config) {
        console.error("config not found", id);
        update((n) => {
          return { ...n, isRefreshing: false };
        });
        return false;
      }
      // const params = generateParamsForCharts(config.cards.map((c) => c.period));
      const params = generateParamsForCards(config.cards);
      const db = new SurrealDatabase();
      const res = await db.executeReadFn(
        "return fn::pointron::analytics::page::fetch($params)",
        {
          params
        }
      );
      const data = interceptSurrealResponse(res);
      if (!data) {
        console.error("data not found", id);
        update((n) => {
          return { ...n, isRefreshing: false };
        });
        return false;
      }
      set({ data, id, config, isRefreshing: false });
      return true;
    }
  };
}

class FocusAggregates {
  async aggregateFocusForADay(params: {
    day: Date;
    goalIds?: IRecordId[];
    goalId?: IRecordId;
  }) {
    const dayFilter = getTimePeriodFilterForDay(params.day);
    const logs = await sessionLogStore.selectMany({
      filters: {
        startUnix: dayFilter,
        goalId: params.goalIds ?? params.goalId?.toString()
      }
    });
    if (!logs) return 0;
    if (params.goalIds) {
      let data: {
        id: IRecordId;
        focus: number;
      }[] = [];
      params.goalIds.forEach((goalId) => {
        const goalLogs = logs.filter((log) =>
          isSameResource(log.goalId, goalId)
        );
        const focus = goalLogs.reduce((acc, log) => acc + log.focus, 0);
        data.push({
          id: goalId,
          focus
        });
      });
      return data;
    } else {
      return logs.reduce((acc, log) => acc + log.focus, 0);
    }
  }
}

export const focusAggregates = new FocusAggregates();
