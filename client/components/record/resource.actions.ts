import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import {
  resolveMultiSelectStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import { copyResourceLinkToClipboard } from "../../products/memotron/memotron.utils";
import {
  ResourceAccessPoint,
  ResourceAccessMode,
  ResourceActionType,
  type IResourceCaptureV2
} from "$lib/client/components/flux/resourceStores/resource.type";
import { uiState } from "$lib/client/stores/uiState/uiState.store";
import { get } from "svelte/store";
import {
  determineResourceAccessMode,
  determineResourceType,
  isSameResource,
  resolveResourceActionIcon,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import {
  ContextMenuType,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { tabs } from "$lib/client/layout/topNav/tabs/tabs.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { LinkType } from "$lib/client/products/memotron/linking/link.type";
import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
import { toasts } from "$lib/client/stores/notification.store";
import { Action } from "$lib/client/types/action.enum";
import { AppSearchParam } from "$lib/client/types/appStore.type";
import { UIStateScope } from "$lib/client/stores/uiState/uiState.type";

export class ResourceActions<T extends IMemotronItemBase> {
  accessPoint?: ResourceAccessPoint;
  accessMode?: ResourceAccessMode;
  constructor(
    private resource: T,
    private store: ResourceStore<T, IResourceCaptureV2<T>>,
    params?: {
      accessPoint?: ResourceAccessPoint;
      accessMode?: ResourceAccessMode;
    }
  ) {
    this.resource = resource;
    this.store = store;
    this.accessPoint = params?.accessPoint;
    this.accessMode = params?.accessMode;
  }
  copyLink(): IContextMenuItem {
    return {
      label: "Copy link",
      value: ResourceActionType.COPY_LINK,
      icon: resolveResourceActionIcon(ResourceActionType.COPY_LINK),
      callback: async () => {
        copyResourceLinkToClipboard(this.resource.id);
        toasts.success("Link copied to clipboard");
      }
    };
  }
  copyExternalLink(): IContextMenuItem {
    return {
      label: "Copy source link",
      value: "copyExternalLink",
      icon: "copy",
      callback: async () => {
        const url = (this.resource as any)?.url;
        if (url) {
          await navigator.clipboard.writeText(url);
          toasts.success("External link copied to clipboard");
        }
      }
    };
  }
  copyContents(): IContextMenuItem {
    return {
      label: "Copy contents",
      value: ResourceActionType.COPY_CONTENTS,
      icon: resolveResourceActionIcon(ResourceActionType.COPY_CONTENTS),
      callback: async () => {
        this.store.copyContents(this.resource.id);
        toasts.success("Contents copied to clipboard");
      }
    };
  }
  star(): IContextMenuItem {
    return {
      label: this.resource.isStarred ? "Unstar" : "Star this resource",
      value: "star",
      icon: resolveResourceActionIcon(ResourceActionType.STAR),
      callback: async () => {
        this.store.modify(
          this.resource.id,
          {
            isStarred: !this.resource.isStarred
          } as T,
          {
            context: this.accessPoint
          }
        );
      }
    };
  }
  starAsToggle(): IContextMenuItem {
    return {
      value: "star",
      label: "Star",
      activeLabel: "Starred",
      icon: resolveResourceActionIcon(ResourceActionType.STAR),
      type: ContextMenuType.SWITCH,
      initialValue: this.resource.isStarred,
      callback: async (checked) => {
        this.store.modify(this.resource.id, { isStarred: checked } as T, {
          context: this.accessPoint
        });
      }
    };
  }
  archive(): IContextMenuItem {
    return {
      value: this.resource.isArchived ? "unarchive" : "archive",
      icon: resolveResourceActionIcon(
        this.resource.isArchived
          ? ResourceActionType.UNARCHIVE
          : ResourceActionType.ARCHIVE
      ),
      callback: async () => {
        if (this.resource.isArchived) {
          this.store.unarchive(this.resource.id, {
            context: this.accessPoint
          });
        } else {
          this.store.archive(this.resource.id, {
            context: this.accessPoint
          });
        }
      }
    };
  }
  trash(): IContextMenuItem {
    return {
      value: this.resource.trashInformation ? "restore" : "delete",
      icon: resolveResourceActionIcon(
        this.resource.trashInformation
          ? ResourceActionType.RESTORE
          : ResourceActionType.DELETE
      ),
      callback: async () => {
        if (this.resource.trashInformation) {
          this.store.restore(this.resource.id, {
            context: this.accessPoint
          });
        } else {
          this.store.trash(this.resource.id, {
            context: this.accessPoint
          });
        }
      }
    };
  }
  /**
   * Action triggered from either resource browser or library page.
   * @returns
   */
  select(
    accessPoint: ResourceAccessPoint,
    accessPointId?: IRecordId
  ): IContextMenuItem {
    let multiSelectContext = {
      resource: determineResourceType(this.resource.id),
      accessPoint,
      accessPointId
    };
    const multiSelectStore = resolveMultiSelectStore(multiSelectContext);
    return {
      label: get(multiSelectStore)?.some(resourceInList(this.resource.id))
        ? "Unselect"
        : "Select",
      value: ResourceActionType.SELECT,
      icon: "check-circle",
      callback: async () => {
        if (get(multiSelectStore)?.some(resourceInList(this.resource.id))) {
          multiSelectStore.update((x) =>
            x.filter((y) => !isSameResource(y, this.resource.id))
          );
        } else {
          multiSelectStore.update((x) => [...x, this.resource.id]);
        }
      }
    };
  }
  edit(context: ResourceAccessPoint): IContextMenuItem {
    return {
      label: this.resource.isInEditMode ? "Exit edit mode" : "Edit",
      value: ResourceActionType.EDIT,
      icon: this.resource.isInEditMode ? "exit-edit" : "edit",
      callback: async () => {
        if (context != ResourceAccessPoint.SELF) {
          appStore.openResource(
            this.resource.id,
            context === ResourceAccessPoint.BROWSER
              ? ResourceAccessMode.INLINE
              : ResourceAccessMode.POP,
            {
              searchParams: {
                [AppSearchParam.EDIT]: true
              }
            }
          );
        } else {
          this.store.toggleEditMode(
            this.resource.id,
            !this.resource.isInEditMode
          );
        }
      }
    };
  }
  toggleReadMode(): IContextMenuItem {
    return {
      value: ResourceActionType.TOGGLE_READ_MODE,
      label: "Read mode",
      icon: resolveResourceActionIcon(ResourceActionType.TOGGLE_READ_MODE),
      type: ContextMenuType.SWITCH,
      initialValue: this.resource.isInReadOnlyMode,
      callback: async (checked) => {
        console.log({ checked });
        this.store.toggleReadMode(this.resource.id, checked);
      }
    };
  }
  toggleFocusMode(): IContextMenuItem {
    return {
      value: "focusMode",
      label: "Focus",
      activeLabel: "Focused",
      icon: "circle",
      type: ContextMenuType.SWITCH,
      initialValue: this.resource.isInFocusMode,
      callback: async (checked) => {
        console.log({ checked });
        this.store.toggleFocusMode(this.resource.id, checked);
      }
    };
  }
  toggleLock(): IContextMenuItem {
    return {
      value: ResourceActionType.LOCK,
      label: "Lock",
      activeLabel: "Locked",
      icon: "lock-open",
      activeIcon: "lock",
      type: ContextMenuType.SWITCH,
      initialValue: this.resource.isLocked,
      callback: async (checked) => {
        return this.store.modify(this.resource.id, {
          isLocked: checked
        } as T);
      }
    };
  }
  openAsTab(): IContextMenuItem {
    const tabData = uiState.getState(ResourceAccessPoint.TABS, {
      scope: UIStateScope.PRODUCT
    });
    const isAlreadyPinned = tabData?.some(resourceInList(this.resource.id));
    return {
      value: isAlreadyPinned ? "Remove from tabs" : "Open as tab",
      icon: isAlreadyPinned ? "minus-circle" : "tabs",
      callback: async () => {
        if (isAlreadyPinned) {
          tabs.remove(this.resource.id);
        } else {
          tabs.open(this.resource.id);
        }
      }
    };
  }
  /**
   * @deprecated - use openAsSplit instead
   */
  openAsSplitv1(): IContextMenuItem {
    return {
      value: "open-as-split",
      icon: "split-screen",
      callback: async () => {
        appStore.openResource(this.resource.id, ResourceAccessMode.SPLIT);
      }
    };
  }
  openAsSplit(): IContextMenuItem {
    const currentMode = determineResourceAccessMode(this.resource.id);
    return {
      value: "open-as-split",
      label:
        currentMode === ResourceAccessMode.SPLIT
          ? "Close split screen"
          : "Open in split screen",
      icon:
        currentMode === ResourceAccessMode.SPLIT
          ? "minus-circle"
          : "split-screen",
      callback: async () => {
        if (currentMode === ResourceAccessMode.SPLIT) {
          appStore.closeResource({
            id: this.resource.id,
            accessMode: ResourceAccessMode.SPLIT
          });
        } else {
          appStore.openResource(this.resource.id, ResourceAccessMode.SPLIT);
        }
      }
    };
  }
  openAsFull(): IContextMenuItem {
    const currentMode = determineResourceAccessMode(this.resource.id);
    return {
      value: "open-in-full-screen",
      label:
        currentMode === ResourceAccessMode.FULL
          ? "Close full screen"
          : "Open in full screen",
      icon:
        currentMode === ResourceAccessMode.FULL ? "minus-circle" : "fullscreen",
      callback: async () => {
        appStore.toggleFullScreen(currentMode, this.resource.id);
      }
    };
  }
  unlink(contextId: IRecordId): IContextMenuItem {
    const isCollection =
      determineResourceType(contextId) === Resource.collection;
    return {
      label: isCollection ? "Remove from collection" : "Unlink",
      value: ResourceActionType.UNLINK,
      icon: resolveResourceActionIcon(ResourceActionType.UNLINK),
      callback: async () => {
        await linker.unlink(this.resource.id, contextId, {
          linkType: LinkType.DIRECT,
          isIncludeReverseDirection: !isCollection,
          context: contextId.toString()
        });
        if (isCollection) {
          this.store.modify(this.resource.id, {
            collections: this.resource.collections?.filter(
              (x) => !isSameResource(x, contextId)
            )
          });
        }
      }
    };
  }
  link(): IContextMenuItem {
    return {
      label: "Add a link",
      value: ResourceActionType.LINK,
      icon: resolveResourceActionIcon(ResourceActionType.LINK),
      callback: async () => {
        appStore.runAction(Action.BULK_LINK, {
          componentParams: {
            items: [this.resource.id]
          }
        });
      }
    };
  }
  addToCollection(): IContextMenuItem {
    return {
      label: "Add to collection",
      value: "addToCollection",
      icon: resolveResourceActionIcon(ResourceActionType.ADD_TO),
      callback: async () => {
        appStore.runAction(Action.BULK_LINK, {
          componentParams: {
            label: "Add to collection",
            resource: Resource.collection,
            items: [this.resource.id]
          }
        });
      }
    };
  }
}
