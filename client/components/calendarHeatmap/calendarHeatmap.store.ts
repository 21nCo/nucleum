import { Orientation } from "$lib/client/types/direction.enum";
import { readable, writable } from "svelte/store";

/**
 * Calendar Heatmap stores
 */
export const CalendarHeatMapData = writable<any>();
export const CalendarHeatMapLayout = writable<
  Orientation.Horizontal | Orientation.Vertical
>(Orientation.Horizontal);

export const CalendarHeatMapstoreColors = readable<string[]>([
  "#D8E4D8",
  "#B2CAB1",
  "#9FBD9D",
  "#79A376",
  "#5B8958",
  "#407C3C"
]);
