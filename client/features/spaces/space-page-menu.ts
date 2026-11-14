import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";
import type { ISpace } from "@nucleum/features/spaces/space.type";

function thenRefresh(
  item: IContextMenuItem,
  onChanged: () => Promise<unknown> | unknown
): IContextMenuItem {
  return {
    ...item,
    callback: async (props?: unknown) => {
      await item.callback?.(props);
      await onChanged();
    }
  };
}

/**
 * Menu of an open space page: rename, pin to the app menu, star, archive and
 * move to trash. The open space's store caches its record, so `onChanged`
 * reloads it after star, archive or trash so the menu offers the reverse.
 */
export function resolveSpacePageMenu(
  space: ISpace,
  params: {
    isPinned: boolean;
    onRename: () => void;
    onTogglePin: () => void;
    onChanged: () => Promise<unknown> | unknown;
  }
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
        thenRefresh(resourceActions.star(), params.onChanged)
      ]
    },
    {
      group: "more",
      items: [
        thenRefresh(resourceActions.archive(), params.onChanged),
        thenRefresh(resourceActions.trash(), params.onChanged)
      ]
    }
  ];
}
