import type { ICalendarHeatMapDataProvider } from "$lib/client/components/calendar/calendarHeatmap/calendarHeatmap.types";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { TimeScale } from "$lib/client/types/time.type";
import type { IFocusHeatMapStore } from "./journal.types";
import { replaceParams } from "$lib/shared/utils/surreal.utils";
import { getprevDateRange } from "$lib/client/components/calendar/calendarHeatmap/calendarHeatMap.utils";
import { dataManager } from "$lib/client/persistence/dataManager";
import { ObservableStore } from "$lib/client/stores/client.store";
import { StoreDataType } from "$lib/client/types/data.type";
import { isSameDay } from "$lib/client/utils/time.utils";
const last12MonthDateRange = getprevDateRange();

const seedFocusHeatmapStore: IFocusHeatMapStore = {
  dailyJournalDateRange: {
    start: last12MonthDateRange.firstMonthEndDate,
    end: last12MonthDateRange.lastMonthStartDate
  },
  dailyJournal: []
};

class FocusHeatmapStore
  extends ObservableStore<IFocusHeatMapStore>
  implements ICalendarHeatMapDataProvider
{
  constructor() {
    super(Resource.focusHeatmap, StoreDataType.NA, {
      dboDependencies: ["fn::pointron::journal::fetch"]
    });
    this.set(seedFocusHeatmapStore);
  }
  loader(data: any) {
    const n = this.get();
    this.set({ ...n, dailyJournal: data });
  }
  async refresh() {
    const n = this.get();
    // if (n.isPageRefreshing) {
    //   return new Promise((resolve) => setTimeout(() => resolve(-1), 1000));
    // } else {
    //   return dataManager.refresh(this.id);
    // }
    return dataManager.refresh(this.id);
  }
  resolveRefreshQuery() {
    const n = this.get();
    return replaceParams(
      "return fn::pointron::journal::fetch($scale, $start, $end)",
      {
        scale: TimeScale.DAYS,
        start: n.dailyJournalDateRange.start,
        end: n.dailyJournalDateRange.end
      }
    );
  }
  async fetchDailyJournal(start: Date, end: Date) {
    const n: IFocusHeatMapStore = this.get();
    if (
      n.dailyJournal.length > 0 &&
      isSameDay(start, n.dailyJournalDateRange.start) &&
      isSameDay(end, n.dailyJournalDateRange.end)
    ) {
      return n.dailyJournal;
    } else {
      this.update((n) => {
        n.dailyJournalDateRange = { start, end };
        n.dailyJournal = [];
        return n;
      });
      // while (this.get().isPageRefreshing) {
      //   await new Promise((resolve) => setTimeout(resolve, 1000));
      // }
      // if (this.get().dailyJournal.length === 0)
      await this.refresh();
      return this.get().dailyJournal;
    }
  }
  async fetchJournal(
    scale: TimeScale.MONTHS | TimeScale.YEARS,
    start: number,
    end: number
  ) {
    //TODO
    return [];
  }
}

export const focusHeatmapStore = new FocusHeatmapStore();
