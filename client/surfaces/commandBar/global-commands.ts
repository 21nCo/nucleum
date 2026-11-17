import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import CommandBar from "@nucleum/surfaces/commandBar/CommandBar.svelte";
import { Placement } from "@21n/ui/elements/direction.enum";
import { Action } from "@nucleum/client/config/action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { resolveNewCommands } from "@nucleum/surfaces/commandBar/new-commands";

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
  new_commands: {
    action: Action.NEW_COMMANDS,
    type: ActionType.SEARCH_CMD,
    label: "New",
    cmdLabel: "New",
    icon: "plus",
    isMeta: true,
    searchActionParams: {
      placeholder: "Create something new",
      searchCallback: async (query: string) =>
        resolveNewCommands(query, (slug) =>
          requireCommandHost().resolveAction(slug)
        ),
      callback: async (item: { id: string }) => {
        requireCommandHost().runAction(item.id);
      }
    }
  },
  search: {
    action: Action.SEARCH,
    label: "Search",
    icon: "search",
    type: ActionType.FUNCTION,
    fn: async () => {
      requireCommandHost().runAction(Action.CMD, {
        componentParams: { scope: "search" }
      });
    }
  },
  activate_search_box: {
    action: GlobalEvent.ACTIVATE_SEARCH_BOX,
    label: "Activate search box",
    isMeta: true,
    type: ActionType.EVENT
  }
} satisfies Record<string, IAction | IAction[]>;
