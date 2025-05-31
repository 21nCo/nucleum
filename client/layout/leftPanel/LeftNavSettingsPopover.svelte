<script lang="ts">
  import { appMenuStore } from "$lib/client/stores/appMenu/appMenu.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { createEventDispatcher } from "svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    reorderList,
    type DragDropEvent
  } from "$lib/client/actions/rearrange.action";
  import {
    resolveProductResources,
    shiftResourceInArray
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { properCase } from "$lib/shared/utils/text.utils";
  import ComponentBaseLayer from "../layers/ComponentBaseLayer.svelte";

  const dispatch = createEventDispatcher();

  interface ResourceItem {
    id: Resource;
    name: string;
    isPinned: boolean;
  }

  let resources: ResourceItem[] = [];
  let userPinnedItems: string[] = [];
  let hideMenuLabels =
    uiState.getState(UIState.hideLeftNavMenuLabels, {
      isProductScoped: true,
      isDeviceScoped: true
    }) || false;

  initResources();

  function initResources(): void {
    const app = $appStore.product;
    const resourceList = resolveProductResources(app);
    userPinnedItems = appMenuStore.get()[app]?.user || [];
    resources = (resourceList ?? []).map((resource) => {
      const isPinned = userPinnedItems.includes(resource);
      return {
        id: resource,
        name: properCase(resource) + "s",
        isPinned
      };
    });
  }

  function persistChanges(): void {
    userPinnedItems = resources.filter((r) => r.isPinned).map((r) => r.id);
    appMenuStore.setUserMenuItems(userPinnedItems);
    dispatch("update");
  }

  function handleReorder(e: DragDropEvent): void {
    const { fromId, toId } = e;
    if (!fromId || !toId) return;
    resources = shiftResourceInArray(resources, fromId, toId);
    persistChanges();
  }

  function handleToggleMenuLabels(e: CustomEvent): void {
    hideMenuLabels = e.detail;
    uiState.setState(UIState.hideLeftNavMenuLabels, hideMenuLabels, {
      isProductScoped: true,
      isDeviceScoped: true
    });
    dispatch("update");
  }
</script>

<div class="w-80 bg-bgs1 p-3 flex flex-col gap-6 border border-brs2 rounded-md">
  <Text content="Menu settings" style={TextStyle.PANEL_HEADING_SMALL} />
  <SwitchInput
    label={{ label: "Hide menu labels" }}
    isExpanded={true}
    checked={hideMenuLabels}
    on:change={handleToggleMenuLabels}
  />
  <div class="flex flex-col gap-2">
    <Text content="Pin resources" style={TextStyle.SECTION_HEADING} />
    {#if resources.length > 0}
      <div
        class="flex flex-col gap-2"
        use:reorderList={{
          listId: "library-resources",
          draggedOverClass: "bg-bgs3",
          onDrop: handleReorder
        }}
      >
        {#each resources as resource, index (resource.id)}
          <div
            class="flex items-center justify-between py-1 px-1 hover:bg-bgs2 rounded transition-colors"
            draggable="true"
            data-index={index}
            data-id={resource.id}
          >
            <div class="flex items-center gap-2">
              <span
                class="cursor-grab text-fgs3 flex items-center justify-center"
              >
                <Icon icon="ph:dots-six-vertical" size={Size.sm} />
              </span>
              <span class="text-fgs2">{resource.name}</span>
            </div>
            <label class="relative inline-block w-10 h-5 cursor-pointer">
              <input
                type="checkbox"
                class="opacity-0 w-0 h-0"
                checked={resource.isPinned}
                on:change={() => {
                  resource.isPinned = !resource.isPinned;
                  persistChanges();
                }}
              />
              <span
                class={cn(
                  "absolute cursor-pointer inset-0 rounded-full transition-colors duration-200",
                  {
                    "bg-aps1": resource.isPinned,
                    "bg-bgs4": !resource.isPinned
                  }
                )}
              >
                <span
                  class={cn(
                    "absolute left-0.5 bottom-0.5 w-4 h-4 rounded-full transition-transform duration-200",
                    {
                      "transform translate-x-5 bg-bgs1": resource.isPinned,
                      "bg-fgs3": !resource.isPinned
                    }
                  )}
                ></span>
              </span>
            </label>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-fgs3">No resources available</p>
    {/if}
  </div>
</div>

<ComponentBaseLayer hasDragAndDrop={true} />
