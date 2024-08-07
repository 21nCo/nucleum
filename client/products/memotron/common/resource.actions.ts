import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import {
  resolveMultiSelectStore,
  ResourceStore
} from "$lib/client/components/resourceStores/resource.store";
import { copyResourceLinkToClipboard } from "../memotron.utils";
import {
  ResourceAccessPoint,
  ResourceAccessMode
} from "$lib/client/components/resourceStores/resource.type";
import { uiState } from "$lib/client/stores/uiState.store";
import { get } from "svelte/store";
import { determineResourceType } from "$lib/client/components/resourceStores/resource.utils";
import { linker } from "../memotron.store";

export class ResourceActions<T extends IMemotronItemBase> {
  constructor(
    private resource: T,
    private store: ResourceStore<T>
  ) {
    this.resource = resource;
    this.store = store;
  }
  copyLink() {
    return {
      label: "Copy link",
      value: "link",
      icon: "copy",
      callback: () => copyResourceLinkToClipboard(this.resource.id)
    };
  }
  star() {
    return {
      label: this.resource.isStarred ? "Unstar" : "Star this resource",
      value: "star",
      icon: "star",
      callback: () => {
        this.store.modify(this.resource.id, {
          isStarred: !this.resource.isStarred
        } as T);
      }
    };
  }
  archive() {
    return {
      value: this.resource.isArchived ? "unarchive" : "archive",
      icon: "archive",
      callback: () => {
        this.resource.isArchived
          ? this.store.unarchive(this.resource.id)
          : this.store.archive(this.resource.id);
      }
    };
  }
  trash() {
    return {
      value: this.resource.trashInformation ? "restore" : "delete",
      icon: "trash",
      callback: () => {
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
  select(accessPoint: ResourceAccessPoint, accessPointId?: string) {
    let multiSelectContext =
      determineResourceType(this.resource.id) + "-" + accessPoint;
    if (accessPointId) {
      multiSelectContext = accessPointId + "-" + accessPoint;
    }
    const multiSelectStore = resolveMultiSelectStore(multiSelectContext);
    // console.log({
    //   multiSelectContext,
    //   multiSelectStoreValue: get(multiSelectStore)
    // });
    return {
      label: get(multiSelectStore)?.includes(this.resource.id)
        ? "Unselect"
        : "Select",
      value: "select",
      icon: "check-circle",
      callback: () => {
        if (get(multiSelectStore)?.includes(this.resource.id)) {
          multiSelectStore.update((x) =>
            x.filter((y) => y != this.resource.id)
          );
        } else {
          multiSelectStore.update((x) => [...x, this.resource.id]);
        }
      }
    };
  }
  edit(context: ResourceAccessPoint) {
    return {
      label: "Edit",
      value: "edit",
      icon: "pencil-square",
      callback: () => {
        if (context != ResourceAccessPoint.SELF) {
          appStore.resourceClickHandler(
            {} as MouseEvent,
            this.resource.id,
            context === ResourceAccessPoint.BROWSER
              ? ResourceAccessMode.INLINE
              : ResourceAccessMode.POP
          );
        }
        isInEditMode.toggle(true);
      }
    };
  }
  pinToTopBar() {
    const isAlreadyPinned = uiState
      .getTopBarState()
      ?.includes(this.resource.id);
    return {
      value: isAlreadyPinned ? "Unpin from top bar" : "Pin to top bar",
      icon: "rocket",
      callback: () => {
        if (isAlreadyPinned) {
          uiState.removeResourceFromTopBar(this.resource.id);
        } else {
          uiState.addResourceToTopBar(this.resource.id);
        }
      }
    };
  }
  unlink(contextId: string) {
    return {
      label: "Unlink",
      value: "unlink",
      icon: "arrow-uturn-left",
      callback: async () => {
        console.log("unlinking", { contextId, id: this.resource.id });
        await linker.unlink(this.resource.id, contextId);
      }
    };
  }
}
