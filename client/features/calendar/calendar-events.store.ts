import { derived, type Readable } from "svelte/store";
import { toSvelteStore } from "@datafn/svelte";
import { datafn } from "@nucleum/datafn/datafn.store";
import {
  mergeCalendarEventResults,
  resolveCalendarEventOverlapFilters
} from "./calendar.utils";

type CalendarEventsState<T> = {
  data: T[];
  loading: boolean;
  refreshing: boolean;
};

/**
 * Live events overlapping `range`, ordered by start time. Runs one query per
 * overlap filter (DataFn servers don't accept `$or`) and merges the results.
 */
export function createCalendarEventsStore<
  T extends { id?: unknown; startUnix?: unknown }
>(range: { start: number; end: number }): Readable<CalendarEventsState<T>> {
  const stores = resolveCalendarEventOverlapFilters(range).map((filters) =>
    toSvelteStore<T[]>(datafn.event.signal({ filters, sort: ["startUnix"] }), {
      initialData: []
    })
  );
  return derived(stores, (values) => ({
    data: mergeCalendarEventResults(values.map((value) => value.data)),
    loading: values.some((value) => value.loading),
    refreshing: values.some((value) => value.refreshing)
  }));
}
