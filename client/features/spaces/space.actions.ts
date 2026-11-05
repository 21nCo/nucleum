import type { IContextMenu } from "@21n/ui/elements/contextMenu/context-menu.type";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
import type { ISpace } from "@nucleum/features/spaces/space.type";

/** Context menu of a space: open, pin to the app menu, and record actions. */
export function resolveSpaceContextMenu(
  space: ISpace,
  accessPoint: ResourceAccessPoint,
  params?: { accessPointId?: IRecordId; accessPointContext?: string }
): IContextMenu {
  const resourceActions = new ResourceActions(space, { accessPoint });
  const spaceId = space.id.toString();
  const isPinned = appMenuStore.isSpacePinned(spaceId);
  const groups: IContextMenu = [
    {
      group: "open",
      items: [
        {
          label: "Open",
          value: "open",
          icon: "combination",
          callback: async () => {
            navigation.openResource(space.id, AccessMode.PAGE, {
              origin: params?.accessPointId
            });
          }
        },
        resourceActions.openAsTab()
      ]
    },
    {
      group: "pin",
      items: [
        {
          label: isPinned ? "Unpin from app menu" : "Pin to app menu",
          value: "pin",
          icon: isPinned ? "unpin" : "pin",
          callback: async () => {
            if (isPinned) appMenuStore.unpinSpace(spaceId);
            else appMenuStore.pinSpace(spaceId);
          }
        }
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
  if (accessPoint === ResourceAccessPoint.SELF) return groups;
  return [
    {
      group: "all",
      items: [
        resourceActions.star(),
        resourceActions.select(accessPoint, params?.accessPointId),
        resourceActions.copyLink()
      ]
    },
    ...groups
  ];
}
