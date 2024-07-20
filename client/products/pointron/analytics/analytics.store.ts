import { get, writable } from "svelte/store";
import {
  AnalyticsCardGrouping,
  type IAnalyticsConfigStore,
  type AnalyticsPageStore,
  type AnalyticsPage,
  type AnalyticsCard,
  AnalyticsCardType
} from "./analytics.types";
import { generateUID, interceptSurrealResponse } from "$lib/client/utils/utils";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { deepCopy } from "$lib/shared/utils/obj.utils";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import {
  generateAnalyticsSeedPages,
  generateParamsForCards
} from "./analytics.utils";
import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";

const analyticsConfigStoreId = Resource.pointAnalyticsConfig;

const seedPage: AnalyticsPage = {
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
const seedAnalyticsConfig: IAnalyticsConfigStore = {
  isIncludeBreakInAnalytics: false,
  pages: generateAnalyticsSeedPages()
};

class AnalyticsConfigStore extends KeyValueStore<IAnalyticsConfigStore> {
  constructor() {
    super(Resource.pointAnalyticsConfig, { ...seedAnalyticsConfig });
  }
  set(config: IAnalyticsConfigStore) {
    this.modify(config, { isDebouncedPersist: true });
  }
  reset() {
    const val = { ...seedAnalyticsConfig, pages: [deepCopy(seedPage)] };
    this.modify(val, { isDebouncedPersist: true });
  }
  loader(data: IAnalyticsConfigStore) {
    if (data.pages.length === 0) {
      this.loadSeedData();
    } else {
      const val = { ...data, id: analyticsConfigStoreId };
      this.modify(val, { isPersist: false });
    }
  }
  updateCardConfig(pageId: string, config: AnalyticsCard) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === pageId);
    if (!page) return;
    const chart = page.cards.find((c) => c.id === config.id);
    if (!chart) return;
    Object.assign(chart, config);
    this.modify(state, { isDebouncedPersist: true });
  }
  removeCard(pageId: string, chartId: string) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === pageId);
    if (!page) return;
    const index = page.cards.findIndex((c) => c.id === chartId);
    if (index > -1) {
      page.cards.splice(index, 1);
    }
    this.modify(state, { isDebouncedPersist: true });
  }
  addCard(pageId: string) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === pageId);
    if (!page) return;
    page.cards.push({
      id: generateUID(),
      grouping: AnalyticsCardGrouping.DEFAULT,
      filter: [],
      type: AnalyticsCardType.PIE,
      period: {
        scale: TimeScale.DAYS,
        value: {
          type: TimePeriodType.RELATIVE,
          param: 0
        }
      }
    });
    this.modify(state, { isDebouncedPersist: true });
  }
  addPage() {
    let state = this.get();
    state.pages.push({ ...seedPage, id: generateUID() });
    this.modify(state, { isDebouncedPersist: true });
  }
  editPageLabel(id: string, label: string) {
    let state = this.get();
    const page = state.pages.find((p) => p.id === id);
    if (!page) return;
    page.label = label;
    this.modify(state, { isDebouncedPersist: true });
  }
  removePage(id: string) {
    let state = this.get();
    const index = state.pages.findIndex((p) => p.id === id);
    if (index > -1) {
      state.pages.splice(index, 1);
    }
    this.modify(state, { isDebouncedPersist: true });
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
