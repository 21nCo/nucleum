import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import {
  resolveMultiSelectStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import { copyResourceLinkToClipboard } from "../../products/memotron/memotron.utils";
import {
  ResourceAccessPoint,
  ResourceAccessMode
} from "$lib/client/components/flux/resourceStores/resource.type";
import { uiState } from "$lib/client/stores/uiState/uiState.store";
import { get } from "svelte/store";
import {
  determineResourceType,
  isSameResource,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import {
  ContextMenuType,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { tabs } from "$lib/client/layout/tabs/tabs.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { LinkType } from "$lib/client/products/memotron/node/node.type";
import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
import { toasts } from "$lib/client/stores/notification.store";
import { Action } from "$lib/client/types/action.enum";

export class ResourceActions<T extends IMemotronItemBase> {
  constructor(
    private resource: T,
    private store: ResourceStore<T>,
    private accessPoint: ResourceAccessPoint
  ) {
    this.resource = resource;
    this.store = store;
    this.accessPoint = accessPoint;
  }
  copyLink(): IContextMenuItem {
    return {
      label: "Copy link",
      value: "link",
      icon: "copy",
      callback: async () => {
        copyResourceLinkToClipboard(this.resource.id);
        toasts.success("Link copied to clipboard");
      }
    };
  }
  copyContents(): IContextMenuItem {
    return {
      label: "Copy contents",
      value: "copy-contents",
      icon: "copy",
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
      icon: "ph:star-light",
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
      icon: "ph:star-light",
      activeIcon: "ph:star-fill",
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
      icon: "ph:archive-light",
      callback: async () => {
        this.resource.isArchived
          ? this.store.unarchive(this.resource.id, {
              context: this.accessPoint
            })
          : this.store.archive(this.resource.id, {
              context: this.accessPoint
            });
      }
    };
  }
  trash(): IContextMenuItem {
    return {
      value: this.resource.trashInformation ? "restore" : "delete",
      icon: "ph:trash-light",
      callback: async () => {
        this.resource.trashInformation
          ? this.store.restore(this.resource.id, {
              context: this.accessPoint
            })
          : this.store.trash(this.resource.id, {
              context: this.accessPoint
            });
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
      value: "select",
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
      value: "edit",
      icon: this.resource.isInEditMode
        ? "ph:pencil-simple-slash-light"
        : "ph:pencil-simple-line-light",
      callback: async () => {
        if (context != ResourceAccessPoint.SELF) {
          appStore.openResource(
            this.resource.id,
            context === ResourceAccessPoint.BROWSER
              ? ResourceAccessMode.INLINE
              : ResourceAccessMode.POP,
            {
              searchParams: {
                edit: true
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
      value: "readMode",
      label: "Read mode",
      icon: "ph:book-open-light",
      activeIcon: "ph:eye-light",
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
      icon: "ph:circle-light",
      activeIcon: "ph:circle-fill",
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
      value: "lock",
      label: "Lock",
      activeLabel: "Locked",
      icon: "ph:lock-open-light",
      activeIcon: "ph:lock-light",
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
      isProductScoped: true
    });
    const isAlreadyPinned = tabData?.some(resourceInList(this.resource.id));
    return {
      value: isAlreadyPinned ? "Remove from tabs" : "Open as tab",
      icon: isAlreadyPinned ? "ph:minus-circle-light" : "ph:tabs-light",
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
      icon: "ph:square-split-horizontal-light",
      callback: async () => {
        appStore.openResource(this.resource.id, ResourceAccessMode.SPLIT);
      }
    };
  }
  openAsSplit(): IContextMenuItem {
    const currentMode = appStore.determineResourceAccessMode(this.resource.id);
    return {
      value: "open-as-split",
      label:
        currentMode === ResourceAccessMode.SPLIT
          ? "Close split screen"
          : "Open in split screen",
      icon:
        currentMode === ResourceAccessMode.SPLIT
          ? "ph:minus-circle-light"
          : "ph:square-split-horizontal-light",
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
    const currentMode = appStore.determineResourceAccessMode(this.resource.id);
    return {
      value: "open-in-full-screen",
      label:
        currentMode === ResourceAccessMode.FULL
          ? "Close full screen"
          : "Open in full screen",
      icon:
        currentMode === ResourceAccessMode.FULL
          ? "ph:minus-circle-light"
          : "ph:arrows-out-light",
      callback: async () => {
        if (currentMode === ResourceAccessMode.FULL) {
          appStore.closeResource({
            id: this.resource.id,
            accessMode: ResourceAccessMode.FULL
          });
        } else {
          appStore.openResource(this.resource.id, ResourceAccessMode.FULL);
        }
      }
    };
  }
  unlink(contextId: IRecordId): IContextMenuItem {
    const isCollection =
      determineResourceType(contextId) === Resource.collection;
    return {
      label: isCollection ? "Remove from collection" : "Unlink",
      value: "unlink",
      icon: "ph:link-break-light",
      callback: async () => {
        await linker.unlink(this.resource.id, contextId, {
          linkType: LinkType.DIRECT,
          isIncludeReverseDirection: !isCollection,
          context: contextId.toString()
        });
      }
    };
  }
  link(): IContextMenuItem {
    return {
      label: "Link or Add to collection",
      value: "link",
      icon: "ph:link-light",
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
      icon: "ph:plus-light",
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
