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
import { dataManager } from "$lib/client/stores/data.store";
import { deepCopy } from "$lib/client/utils/obj.utils";
import { SurrealDatabase } from "$lib/client/access/surrealHelper";
import {
  generateParamsForCards,
  generateParamsForCharts
} from "./analytics.utils";

const analyticsConfigStoreId = Item.pointAnalyticsConfig;

const seedPage: AnalyticsPage = {
  id: generateUID(),
  label: "new page",
  cards: [
    {
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
    },
    {
      id: generateUID(),
      grouping: AnalyticsCardGrouping.DEFAULT,
      filter: [],
      type: AnalyticsCardType.PIE,
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
  pages: []
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
    const val = { ...seedAnalyticsConfig, pages: [deepCopy(seedPage)] };
    set(val);
    debounedPersist(val);
    console.log("loading seed data - analytics config", val);
  };
  return {
    subscribe,
    update,
    loadSeedData,
    set: (config: AnalyticsConfigStore) => {
      console.log("set analytics config", config);
      set(config);
      debounedPersist(config);
    },
    reset: () => {
      const val = { ...seedAnalyticsConfig, pages: [deepCopy(seedPage)] };
      set(val);
      debounedPersist(val);
    },
    loader: (data: AnalyticsConfigStore) => {
      console.log("load analytics config", data);
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
        console.log("update card config", { pageId, config, state });
        const page = state.pages.find((p) => p.id === pageId);
        if (!page) return state;
        const chart = page.cards.find((c) => c.id === config.id);
        if (!chart) return state;
        Object.assign(chart, config);
        console.log("updated card config", { pageId, config, state });
        return state;
      });
      debounedPersist(get(analyticsConfigStore));
    },
    removeCard: (pageId: string, chartId: string) => {
      update((state) => {
        console.log("remove card", { pageId, chartId, state });
        const page = state.pages.find((p) => p.id === pageId);
        if (!page) return state;
        const index = page.cards.findIndex((c) => c.id === chartId);
        if (index > -1) {
          console.log("remove card", { index });
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
        console.log("add page");
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
          console.log("remove page", { id, index });
          state.pages.splice(index, 1);
        }
        console.log("removed page - pages after removal", {
          id,
          index,
          state
        });
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
      console.log("refresh analytics page", { id });
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
      console.log("refreshed analytics page", { config, id, data });
      return true;
    }
  };
}
