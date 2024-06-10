import type { CalendarHeatMapDataProvider } from "$lib/client/components/calendarHeatmap/calendarHeatmap.types";
import { Item } from "$lib/client/types/item.enum";
import { TimeScale } from "$lib/client/types/time.type";
import { get, writable } from "svelte/store";
import type { FocusHeatMapStore } from "./journal.types";
import {
  StoreDataType,
  type CacheableStoreContract
} from "$lib/client/types/data.type";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { getprevDateRange } from "$lib/client/components/calendarHeatmap/calendarHeatMap.utils";
import { dataManager } from "$lib/client/persistence/dataManager";
import { logger } from "$lib/client/stores/log.store";
export type FocusHeatmapStoreContract = ReturnType<
  typeof initFocusHeatmapStore
> &
  CalendarHeatMapDataProvider &
  CacheableStoreContract;

const last12MonthDateRange = getprevDateRange();

const seedFocusHeatmapStore: FocusHeatMapStore = {
  id: Item.focusHeatmap,
  dataType: StoreDataType.NON_PERSISTING,
  dailyJournalDateRange: {
    start: last12MonthDateRange.firstMonthEndDate,
    end: last12MonthDateRange.lastMonthStartDate
  },
  dailyJournal: []
};

export const focusHeatmapStore: FocusHeatmapStoreContract =
  initFocusHeatmapStore();

function initFocusHeatmapStore() {
  const { subscribe, set, update } = writable<FocusHeatMapStore>(
    seedFocusHeatmapStore
  );
  const refresh = async () => {
    const n = get(focusHeatmapStore);
    if (n.isPageRefreshing) {
      return new Promise((resolve) => setTimeout(() => resolve(-1), 1000));
    } else {
      return dataManager.refresh(n.id);
    }
  };
  return {
    subscribe,
    set,
    update,
    loader: (data: any) => {
      const n = get(focusHeatmapStore);
      logger.log({ context: "focusHeatmapStore.loader", data });
      set({ ...n, dailyJournal: data });
    },
    resolveRefreshQuery: () => {
      //TODO - if default scale is not DAYS - retrieve current UI State of scale, resolve start and end accordingly
      const dateRange = getprevDateRange();
      return replaceParams(
        "return fn::pointron::journal::fetch($scale, $start, $end)",
        {
          scale: TimeScale.DAYS,
          start: dateRange.firstMonthEndDate,
          end: dateRange.lastMonthStartDate
        }
      );
    },
    fetchDailyJournal: async (start: Date, end: Date) => {
      const n: FocusHeatMapStore = get(focusHeatmapStore);
      if (n.dailyJournal.length > 0) {
        return n.dailyJournal;
      } else {
        while (get(focusHeatmapStore).isPageRefreshing) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (get(focusHeatmapStore).dailyJournal.length === 0) await refresh();
        return get(focusHeatmapStore).dailyJournal;
      }
    },
    fetchJournal: async (
      scale: TimeScale.MONTHS | TimeScale.YEARS,
      start: number,
      end: number
    ) => {
      //TODO
      return [];
    }
  };
}
