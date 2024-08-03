import type { HeatmapDataItem } from "$lib/client/components/calendar/calendarHeatmap/calendarHeatmap.types";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";

export interface IFocusHeatMapStore extends IObservableStoreSubject {
  dailyJournalDateRange: { start: Date; end: Date };
  dailyJournal: HeatmapDataItem[];
}
