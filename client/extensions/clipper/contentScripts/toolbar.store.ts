import { DatafnExtensionMethod } from "@nucleum/extensions/extension.store";
import { extensionDatafn } from "@nucleum/extensions/extension.store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { Placement } from "@21n/ui/elements/direction.enum";
import { get, writable } from "svelte/store";

import { webpage } from "@nucleum/extensions/clipper/contentScripts/webpage.store";

type ClipperToolbarStateValue = {
  isOpen: boolean;
  isHidden?: boolean;
  position: Placement.Right | Placement.Left | Placement.Bottom;
};

const toolbarStateStore = writable<ClipperToolbarStateValue>({
  isOpen: true,
  position: Placement.Right
});

export const toolbarState = {
  subscribe: toolbarStateStore.subscribe,
  get() {
    return get(toolbarStateStore);
  },
  update: toolbarStateStore.update,
  modify(patch: Partial<ClipperToolbarStateValue>) {
    toolbarStateStore.update((state) => ({ ...state, ...patch }));
    return extensionDatafn({
      method: DatafnExtensionMethod.KV_MERGE,
      args: {
        resource: Resource.clipperToolbarState,
        data: patch
      }
    });
  },
  toggle(isOpen?: boolean) {
    if (isOpen === undefined) {
      isOpen = !this.get().isOpen;
    }
    this.modify({ isOpen });
    if (isOpen) {
      setTimeout(() => {
        webpage.refresh();
      }, 100);
    }
  },

  toggleVisibility(isHidden?: boolean) {
    if (isHidden === undefined) {
      isHidden = !this.get().isHidden;
    }
    this.modify({ isHidden });
    setTimeout(() => {
      webpage.refresh();
    }, 100);
  },

  changePosition(
    position: Placement.Right | Placement.Left | Placement.Bottom
  ) {
    this.modify({ position });
  },

  async refresh() {
    const result = await extensionDatafn({
      method: DatafnExtensionMethod.SELECT,
      args: {
        resourceId: `kv:${Resource.clipperToolbarState}`
      }
    });
    if (result?.id) {
      toolbarStateStore.update((state) => ({
        ...state,
        isOpen: result.isOpen,
        position: result.position
      }));
    }
  }
};
