import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";
import { withResourceActionKeys } from "@nucleum/features/records/resource-action-keys";
import type { IActiveSpace, ISpace } from "@nucleum/features/spaces/space.type";

/** Reloads the open space's record after an action changed it. */
type SpaceRefresh = () => Promise<unknown> | void;

/** Callbacks and state the open space's menu needs. */
export type SpacePageMenuParams = {
  isPinned: boolean;
  onRename: () => void;
  onTogglePin: () => void;
  onChanged: SpaceRefresh;
};

function thenRefresh(
  item: IContextMenuItem,
  onChanged: SpaceRefresh
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
  params: SpacePageMenuParams
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

/**
 * The open space's menu with its single-key letters set as hints while
 * `isKeyed`, that is while those keys act on this space. The super bar's
 * registration and the space's top bar menu both build it here.
 */
export function resolveKeyedSpacePageMenu(
  space: ISpace | IActiveSpace,
  params: SpacePageMenuParams & { isKeyed: boolean }
): IContextMenu {
  const menu = resolveSpacePageMenu(space, params);
  return params.isKeyed ? withResourceActionKeys(menu) : menu;
}
