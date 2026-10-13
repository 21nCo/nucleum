import { writable } from "svelte/store";

/** Date selected by calendar views. */
export const selectedTimePeriod = writable<Date>(new Date());

/** Touch capability reported by the calendar heatmap. */
export const isTouchDevice = writable(false);
