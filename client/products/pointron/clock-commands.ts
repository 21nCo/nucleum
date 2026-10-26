import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import SimpleDigitalClock from "@nucleum/products/pointron/clocks/SimpleDigitalClock.svelte";

/** Commands owned by pointron; assembled in application composition. */
export const pointronCommands = {
simpledigitalclock: {
    action: "simpleDigitalClock",
    type: ActionType.PAGE,
    isMeta: true,
    component: SimpleDigitalClock
  }
} satisfies Record<string, IAction | IAction[]>;
