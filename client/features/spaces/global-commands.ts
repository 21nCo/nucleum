import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { Resource } from "@nucleum/datafn/resource.enum";
import { SPACE_PAGE_ACTION } from "@nucleum/client/config/space-route";
import Space from "@nucleum/features/spaces/Space.svelte";
import { createSpace } from "@nucleum/features/spaces/space.store";

/** Commands owned by spaces; assembled in application composition. */
export const spacesCommands = {
  space_create: {
    action: resourceAction(Resource.space, ResourceActionType.CREATE),
    label: "Create a new space",
    icon: "combination",
    type: ActionType.FUNCTION,
    isInactive: false,
    fn: async () => {
      await createSpace();
    }
  },
  space: {
    action: SPACE_PAGE_ACTION,
    label: "Space",
    icon: "combination",
    type: ActionType.PAGE,
    component: Space,
    isMeta: true,
    isSubPathOpen: true
  }
} satisfies Record<string, IAction | IAction[]>;
