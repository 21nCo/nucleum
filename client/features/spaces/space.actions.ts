import type { IContextMenu } from "@21n/ui/elements/contextMenu/context-menu.type";
import { escapeMarkdownText } from "@21n/ui/elements/markdown/markdown.utils";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
import { confirmationNotification } from "@nucleum/shared-state/notifications/notification.store";
import { AlertType } from "@nucleum/shared-state/notifications/notification.type";
import {
  SpaceNavItemType,
  type ISpace,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import type { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";
import { flattenNavItems } from "@nucleum/features/spaces/space.utils";

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
        ...resourceActions.selectIfSupported(
          accessPoint,
          params?.accessPointId
        ),
        resourceActions.copyLink()
      ]
    },
    ...groups
  ];
}

/**
 * Asks before deleting a section or removing a record item from a space. The
 * records themselves are never deleted.
 */
export function confirmSpaceItemDelete(params: {
  store: ActiveSpaceStore;
  item: ISpaceNavItem;
  label: string;
  onConfirm?: () => void;
}) {
  const { store, item, onConfirm } = params;
  const label = escapeMarkdownText(params.label);
  const isSection = item.type === SpaceNavItemType.SECTION;
  const nested = flattenNavItems(item.children ?? []).length;
  confirmationNotification.notify({
    title: isSection ? "Delete section" : "Remove from space",
    message: isSection
      ? `Delete **${label}**${nested ? ` and the ${nested} item${nested === 1 ? "" : "s"} inside it` : ""} from this space? The records themselves are not deleted.`
      : item.type === SpaceNavItemType.PAGE
        ? `Remove the link to **${label}** from this space?`
        : `Remove **${label}** from this space? The record itself is not deleted.`,
    type: AlertType.WARNING,
    confirmAction: {
      label: isSection ? "Delete" : "Remove",
      callback: async () => {
        onConfirm?.();
        await store.deleteNavItem(item.id);
      }
    }
  });
}
