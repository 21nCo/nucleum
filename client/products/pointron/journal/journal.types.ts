import type { HeatmapDataItem } from "$lib/client/components/calendarHeatmap/calendarHeatmap.types";
import type { ICacheableStore } from "$lib/client/types/data.type";

export interface FocusHeatMapStore extends ICacheableStore {
  dailyJournalDateRange: { start: Date; end: Date };
  dailyJournal: HeatmapDataItem[];
}
