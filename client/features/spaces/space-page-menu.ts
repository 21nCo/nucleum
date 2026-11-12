import type { IContextMenu } from "@21n/ui/elements/contextMenu/context-menu.type";
import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";
import type { ISpace } from "@nucleum/features/spaces/space.type";

/**
 * Menu of an open space page: rename, pin to the app menu, star, archive and
 * move to trash.
 */
export function resolveSpacePageMenu(
  space: ISpace,
  params: { isPinned: boolean; onRename: () => void; onTogglePin: () => void }
): IContextMenu {
  const resourceActions = new ResourceActions(space, {
    accessPoint: ResourceAccessPoint.SELF
  });
  return [
    {
      group: "space",
      items: [
        {
          value: "rename",
          label: "Rename",
          icon: "edit",
          callback: async () => params.onRename()
        },
        {
          value: "pin",
          label: params.isPinned ? "Unpin from app menu" : "Pin to app menu",
          icon: params.isPinned ? "unpin" : "pin",
          callback: async () => params.onTogglePin()
        },
        resourceActions.star()
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
