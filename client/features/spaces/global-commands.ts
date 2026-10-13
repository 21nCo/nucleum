import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { Resource } from "@nucleum/datafn/resource.enum";
import CreateCombination from "@nucleum/features/spaces/combination/CreateCombination.svelte";

/** Commands owned by spaces; assembled in application composition. */
export const spacesCommands = {
  space_create: {
    action: resourceAction(Resource.space, ResourceActionType.CREATE),
    component: CreateCombination,
    label: "Create a new space",
    type: ActionType.MODAL,
    isInactive: false,
    modalParams: {
      title: "Create a new space",
      layout: {
        size: Size.sm,
        orientation: Orientation.Vertical,
        isOveriddenFooter: true
      }
    }
  }
} satisfies Record<string, IAction | IAction[]>;
