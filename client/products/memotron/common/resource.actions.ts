import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import {
  resolveMultiSelectStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import { copyResourceLinkToClipboard } from "../memotron.utils";
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
import type { IContextMenuItem } from "$lib/client/types/select.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { tabs } from "$lib/client/layout/tabs/tabs.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

export class ResourceActions<T extends IMemotronItemBase> {
  constructor(
    private resource: T,
    private store: ResourceStore<T>
  ) {
    this.resource = resource;
    this.store = store;
  }
  copyLink(): IContextMenuItem {
    return {
      label: "Copy link",
      value: "link",
      icon: "copy",
      callback: async () => copyResourceLinkToClipboard(this.resource.id)
    };
  }
  copyContents(): IContextMenuItem {
    return {
      label: "Copy contents",
      value: "copy-contents",
      icon: "copy",
      callback: async () => this.store.copyContents(this.resource.id)
    };
  }
  star(): IContextMenuItem {
    return {
      label: this.resource.isStarred ? "Unstar" : "Star this resource",
      value: "star",
      icon: "star",
      callback: async () => {
        this.store.modify(this.resource.id, {
          isStarred: !this.resource.isStarred
        } as T);
      }
    };
  }
  archive(): IContextMenuItem {
    return {
      value: this.resource.isArchived ? "unarchive" : "archive",
      icon: "ph:archive-light",
      callback: async () => {
        this.resource.isArchived
          ? this.store.unarchive(this.resource.id)
          : this.store.archive(this.resource.id);
      }
    };
  }
  trash(): IContextMenuItem {
    return {
      value: this.resource.trashInformation ? "restore" : "delete",
      icon: "ph:trash-light",
      callback: async () => {
        this.resource.trashInformation
          ? this.store.restore(this.resource.id)
          : this.store.trash(this.resource.id);
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
    let multiSelectContext =
      determineResourceType(this.resource.id) + "-" + accessPoint;
    if (accessPointId) {
      multiSelectContext = accessPointId + "-" + accessPoint;
    }
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
        : "ph:pencil-simple-line-thin",
      callback: async () => {
        if (context != ResourceAccessPoint.SELF) {
          appStore.openResource(
            this.resource.id,
            context === ResourceAccessPoint.BROWSER
              ? ResourceAccessMode.INLINE
              : ResourceAccessMode.POP
          );
        }
        this.store.toggleEditMode(
          this.resource.id,
          !this.resource.isInEditMode
        );
      }
    };
  }
  toggleReadMode(): IContextMenuItem {
    return {
      label: this.resource.isInReadMode ? "Exit read mode" : "Read mode",
      value: "readMode",
      icon: this.resource.isInReadMode
        ? "ph:book-open-thin"
        : "ph:book-open-thin",
      callback: async () => {
        this.store.toggleReadMode(
          this.resource.id,
          !this.resource.isInReadMode
        );
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
      icon: isAlreadyPinned ? "ph:x-light" : "ph:tabs-light",
      badge: !isAlreadyPinned ? "New" : undefined,
      callback: async () => {
        if (isAlreadyPinned) {
          tabs.remove(this.resource.id);
        } else {
          tabs.open(this.resource.id);
        }
      }
    };
  }
  openAsSplit(): IContextMenuItem {
    return {
      value: "open-as-split",
      icon: "ph:square-split-horizontal-light",
      callback: async () => {
        appStore.openResource(this.resource.id, ResourceAccessMode.SPLIT);
      }
    };
  }
  openAsFull(): IContextMenuItem {
    const currentMode = appStore.determineCurrentResourceAccessMode(
      this.resource.id
    );
    return {
      value: "open-in-full-screen",
      label:
        currentMode === ResourceAccessMode.FULL
          ? "Close full screen"
          : "Open in full screen",
      icon:
        currentMode === ResourceAccessMode.FULL
          ? "ph:x-light"
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
        await linker.unlink(this.resource.id, contextId);
      }
    };
  }
}
