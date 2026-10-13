import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { Action } from "@nucleum/client/config/action.enum";
import { AccessMode } from "@nucleum/datafn/resource.type";
import ResourceSearchModal from "@nucleum/products/memotron/library/search/ResourceSearchModal.svelte";
import view from "@21n/ui/environment/view.store";

/** Commands owned by memotron; assembled in application composition. */
export const memotronCommands = {
global_search_modal: {
    action: Action.GLOBAL_SEARCH_MODAL,
    component: ResourceSearchModal,
    label: "Search",

    type: ActionType.RESOURCE,
    accessMode: AccessMode.POP,
    preCondition: () => {
      return view.get().isConstrainedWidth;
    },
    modalParams: {
      isShowOverlay: false,
      layout: {
        orientation: Orientation.Horizontal,
        size: Size.xl,
        ignoreSafeArea: true,
        isShowCantileverClose: true
      }
    }
  },
search: {
    action: Action.SEARCH,
    component: ResourceSearchModal,
    label: "Search",
    icon: "search",
    type: ActionType.LIVE,
    accessMode: AccessMode.MAIN
  }
} satisfies Record<string, IAction | IAction[]>;
