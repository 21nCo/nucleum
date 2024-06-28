import { get, writable } from "svelte/store";
import {
  AnalyticsCardGrouping,
  type AnalyticsConfigStore,
  type AnalyticsPageStore,
  type AnalyticsPage,
  type AnalyticsCard,
  AnalyticsCardType
} from "./analytics.types";
import {
  debouncer,
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import {
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import { dataManager } from "$lib/client/persistence/dataManager";
import { deepCopy } from "$lib/client/utils/obj.utils";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import {
  generateAnalyticsSeedPages,
  generateParamsForCards
} from "./analytics.utils";

const analyticsConfigStoreId = Item.pointAnalyticsConfig;

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
const seedAnalyticsConfig: AnalyticsConfigStore = {
  id: analyticsConfigStoreId,
  dataType: StoreDataType.KVO,
  isIncludeBreakInAnalytics: false,
  pages: generateAnalyticsSeedPages()
};

export const analyticsConfigStore = initAnalyticsConfigStore();

function initAnalyticsConfigStore() {
  const { subscribe, set, update } =
    writable<AnalyticsConfigStore>(seedAnalyticsConfig);
  dataManager.retrieveCache(analyticsConfigStoreId).then((config) => {
    if (config) {
      set(config as AnalyticsConfigStore);
    }
  });
  const cache = async (config: AnalyticsConfigStore) => {
    return dataManager.cache(config);
  };
  const persist = (config: AnalyticsConfigStore) => {
    cache({ ...config });
    dataManager.performMutation(
      analyticsConfigStoreId,
      { ...config },
      { action: PersistanceActionType.UPDATE }
    );
  };
  const debounedPersist = debouncer(persist, 1000);
  const loadSeedData = () => {
    const val = { ...seedAnalyticsConfig, pages: generateAnalyticsSeedPages() };
    set(val);
    debounedPersist(val);
  };
  return {
    subscribe,
    update,
    loadSeedData,
    set: (config: AnalyticsConfigStore) => {
      set(config);
      debounedPersist(config);
    },
    reset: () => {
      const val = { ...seedAnalyticsConfig, pages: [deepCopy(seedPage)] };
      set(val);
      debounedPersist(val);
    },
    loader: (data: AnalyticsConfigStore) => {
      // loadSeedData();
      if (!data.id || data.pages.length === 0) {
        loadSeedData();
      } else {
        const val = { ...data, id: analyticsConfigStoreId };
        set(val);
        cache(val);
      }
    },
    updateCardConfig: (pageId: string, config: AnalyticsCard) => {
      update((state) => {
        const page = state.pages.find((p) => p.id === pageId);
        if (!page) return state;
        const chart = page.cards.find((c) => c.id === config.id);
        if (!chart) return state;
        Object.assign(chart, config);
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    },
    removeCard: (pageId: string, chartId: string) => {
      update((state) => {
        const page = state.pages.find((p) => p.id === pageId);
        if (!page) return state;
        const index = page.cards.findIndex((c) => c.id === chartId);
        if (index > -1) {
          page.cards.splice(index, 1);
        }
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    },
    addCard: (pageId: string) => {
      update((state) => {
        const page = state.pages.find((p) => p.id === pageId);
        if (!page) return state;
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
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    },
    addPage: () => {
      update((state) => {
        state.pages.push({ ...seedPage, id: generateUID() });
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    },
    editPageLabel: (id: string, label: string) => {
      update((state) => {
        const page = state.pages.find((p) => p.id === id);
        if (!page) return state;
        page.label = label;
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    },
    removePage: (id: string) => {
      update((state) => {
        const index = state.pages.findIndex((p) => p.id === id);
        if (index > -1) {
          state.pages.splice(index, 1);
        }
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    }
  };
}

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
