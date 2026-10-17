import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import CommandBar from "@nucleum/surfaces/commandBar/CommandBar.svelte";
import { Placement } from "@21n/ui/elements/direction.enum";
import { Action } from "@nucleum/client/config/action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";

/** Commands owned by command; assembled in application composition. */
export const commandCommands = {
  cmd: {
    action: Action.CMD,
    icon: "terminal-window",
    label: "Command bar",
    component: CommandBar,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      isShowOverlay: false,
      layout: {
        ignoreSafeArea: true,
        isDynamicSize: true,
        alignment: Placement.TopCenter
      }
    }
  },
  activate_search_box: {
    action: GlobalEvent.ACTIVATE_SEARCH_BOX,
    label: "Activate search box",
    isMeta: true,
    type: ActionType.EVENT
  }
} satisfies Record<string, IAction | IAction[]>;
