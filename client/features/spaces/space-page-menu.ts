import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";
import type { IActiveSpace, ISpace } from "@nucleum/features/spaces/space.type";

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
 * Whether an open space's record loaded: it has an id and its last load
 * neither failed nor found it missing. A failed reload keeps the earlier
 * snapshot, so the id alone does not tell.
 */
export function isSpaceLoaded(
  space: Partial<IActiveSpace> | undefined
): boolean {
  return !!space?.id && !space.isMissing && !space.isLoadFailed;
}

/**
 * Menu of an open space page: rename, pin to the app menu, star, archive and
 * move to trash. The open space's store caches its record, so `onChanged`
 * reloads it after star, archive or trash so the menu offers the reverse.
 * Star, archive and trash are left out until the record loads.
 */
export function resolveSpacePageMenu(
  space: ISpace | IActiveSpace,
  params: {
    isPinned: boolean;
    onRename: () => void;
    onTogglePin: () => void;
    onChanged: () => Promise<unknown> | unknown;
  }
): IContextMenu {
  const spaceItems: IContextMenuItem[] = [
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
    }
  ];
  if (!isSpaceLoaded(space)) return [{ group: "space", items: spaceItems }];
  const resourceActions = new ResourceActions(space, {
    accessPoint: ResourceAccessPoint.SELF
  });
  return [
    {
      group: "space",
      items: [
        ...spaceItems,
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
