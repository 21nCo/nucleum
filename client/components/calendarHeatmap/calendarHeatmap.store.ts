import { Orientation } from "$lib/client/types/direction.enum";
import { readable, writable } from "svelte/store";

/**
 * Calendar Heatmap stores
 */
export const CalendarHeatMapData = writable<any>();
export const CalendarHeatMapLayout = writable<
  Orientation.Horizontal | Orientation.Vertical
>(Orientation.Horizontal);
