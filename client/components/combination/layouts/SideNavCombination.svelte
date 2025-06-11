<script lang="ts">
  import type { ActiveCombinationStore } from "../combination.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { popover } from "$lib/client/actions/popover.action";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { reorderList } from "$lib/client/actions/rearrange.action";
  import { resizable } from "$lib/client/actions/resize.action";
  import { onMount } from "svelte";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCombinationContextMenu } from "../combination.store";
  import { Placement } from "$lib/client/types/direction.enum";

  export let combination: ActiveCombinationStore;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;

  const SUPPORTED_RESOURCES = [
    Resource.node,
    Resource.goal,
    Resource.task,
    Resource.collection
  ];

  const resourceOptions: ISelectItem[] = [
    {
      label: "Node",
      icon: "ph:article-light",
      value: Resource.node
    },
    {
      label: "Goal",
      icon: "ph:target-light",
      value: Resource.goal
    },
    {
      label: "Task",
      icon: "ph:check-square-light",
      value: Resource.task
    },
    {
      label: "Collection",
      icon: "ph:brackets-round-light",
      value: Resource.collection
    }
  ];

  let isEditingTitle = false;
  let titleValue = $combination?.label || "";
  let items: any[] = [];
  let selectedItemId: IRecordId | null = null;
  let sideNavWidth = 320;
  let sideNavElement: HTMLElement;

  const DEFAULT_WIDTH = 320;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;

  async function loadItems() {
    if (!$combination?.items || $combination.items.length === 0) {
      items = [];
      return;
    }

    try {
      const searchStore = new SearchStore();
      const results = await searchStore.select({
        filters: {
          id: $combination.items
        }
      });

      if (results) {
        items = results.sort((a: any, b: any) => {
          const aIndex = $combination.items?.indexOf(a.id) ?? -1;
          const bIndex = $combination.items?.indexOf(b.id) ?? -1;
          return aIndex - bIndex;
        });
      } else {
        items = [];
      }
    } catch (e) {
      console.error("Error loading items:", e);
      items = [];
    }
  }

  async function onTitleEdit() {
    if (!titleValue.trim()) return;
    await combination.modify({ label: titleValue });
    isEditingTitle = false;
  }

  function onAddExisting() {
    appStore.runAction(Action.ADD_ITEM_TO_COMBINATION, {
      componentParams: {
        label: `Add to **${$combination.label}**`,
        id: $combination.id,
        resources: SUPPORTED_RESOURCES
      }
    });
  }

  function onCreateNew(resource: any) {
    appStore.runResourceAction(resource as Resource, ResourceActionType.CREATE);
  }

  async function onRemoveItem(itemId: IRecordId) {
    try {
      const updatedItems = ($combination.items || []).filter(
        (id: IRecordId) => id !== itemId
      );
      await combination.modify({ items: updatedItems });
      await loadItems();
      if (selectedItemId === itemId) {
        selectedItemId = null;
      }
      toasts.success("Item removed");
    } catch (e) {
      toasts.error("Failed to remove item");
    }
  }

  async function onReorderItems(fromIndex: number, toIndex: number) {
    if (!$combination.items) return;

    const newItems = [...$combination.items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    await combination.modify({ items: newItems });
    await loadItems();
  }

  function onItemClick(itemId: IRecordId) {
    selectedItemId = itemId;
    appStore.openResource(itemId, ResourceAccessMode.INLINE);
  }

  async function saveSideNavConfig() {
    if ($combination?.config?.sideNavWidth !== sideNavWidth) {
      await combination.modify({
        config: {
          ...($combination.config || {}),
          sideNavWidth
        }
      });
    }
  }

  function onSideNavResize(dimensions: { width: number; height: number }) {
    sideNavWidth = dimensions.width;
    saveSideNavConfig();
  }

  onMount(() => {
    const savedWidth = $combination?.config?.sideNavWidth;
    if (savedWidth && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
      sideNavWidth = savedWidth;
    }
  });

  $: if ($combination) {
    loadItems();
    titleValue = $combination?.label || "";
  }

  $: if ($combination) {
    loadItems();
    titleValue = $combination?.label || "";
  }
</script>

<div class="flex h-full w-full bg-bgs1">
  <div
    bind:this={sideNavElement}
    class="bg-bgs2 border-r border-brs2 flex flex-col relative"
    style="width: {sideNavWidth}px; min-width: {MIN_WIDTH}px; max-width: {MAX_WIDTH}px;"
    use:resizable={{
      edges: ["right"],
      onResize: onSideNavResize,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH
    }}
  >
    <div class="p-4 border-b border-brs2">
      {#if isEditingTitle}
        <TextInput
          bind:value={titleValue}
          style={InputStyle.FILLED}
          placeholder="Combination title"
          on:blur={onTitleEdit}
          on:keydown={(e) => {
            if (e.detail?.key === "Enter") onTitleEdit();
            if (e.detail?.key === "Escape") {
              isEditingTitle = false;
              titleValue = $combination?.label || "";
            }
          }}
        />
      {:else}
        <div class="flex items-center justify-between w-full">
          <button
            class="flex-1 text-left text-fgs1 text-b1 font-medium hover:text-aps1 transition-colors"
            on:click={() => (isEditingTitle = true)}
          >
            {$combination?.label || "Untitled"}
          </button>
          <ContextMenuAction
            menuResolver={() =>
              resolveCombinationContextMenu(
                $combination,
                ResourceAccessPoint.SELF
              )}
            position={Placement.BottomCenter}
            id="combinationContextMenu"
            size={Size.lg}
          />
        </div>
      {/if}
    </div>

    {#if $combination?.isInEditMode}
      <div class="p-4 border-b border-brs2">
        <div class="flex flex-col gap-3">
          <Button
            label="Add existing"
            icon="ph:plus-light"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            class="justify-start"
            on:click={onAddExisting}
          />
          <div
            use:popover={{
              content: OptionSelector,
              id: "create-new-resource-popover",
              componentProps: {
                options: resourceOptions,
                labelProps: { label: "Select resource type" },
                selected: Resource.node,
                onSelect: (resource) => onCreateNew(resource),
                class: "w-48 bg-bgs1 border border-brs2 shadow-lg rounded-lg"
              }
            }}
          >
            <Button
              label="Create new"
              icon="ph:sparkle-light"
              style={ButtonStyle.OUTLINED}
              size={Size.sm}
              class="justify-start"
            />
          </div>
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto">
      {#if items.length === 0}
        <div class="p-4 text-center text-fgs3 text-b3">No items added yet</div>
      {:else}
        <div class="p-2">
          <div
            use:reorderList={{
              listId: "combination-items",
              draggedOverClass: "dragged-over",
              onDrop: (e) => {
                const { from, to } = e;
                if ($combination?.isInEditMode) {
                  onReorderItems(from, to);
                }
              }
            }}
          >
            {#each items as item, index (item.id)}
              <div
                class="flex items-center justify-between p-2 rounded-md hover:bg-bgs3 group transition-colors"
                class:bg-aps1={selectedItemId === item.id}
                class:text-white={selectedItemId === item.id}
                data-item-id={item.id}
              >
                <button
                  class="flex-1 text-left text-b3 truncate transition-colors"
                  class:text-fgs2={selectedItemId !== item.id}
                  class:text-white={selectedItemId === item.id}
                  on:click={() => onItemClick(item.id)}
                >
                  <div class="flex items-center gap-2">
                    <Icon
                      icon={item.type === "node"
                        ? "ph:article-light"
                        : item.type === "goal"
                          ? "ph:target-light"
                          : item.type === "task"
                            ? "ph:check-square-light"
                            : "ph:brackets-round-light"}
                      size={Size.xs}
                    />
                    <span>{item.label || "Untitled"}</span>
                  </div>
                </button>
                {#if $combination?.isInEditMode}
                  <button
                    class="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    class:text-fgs3={selectedItemId !== item.id}
                    class:text-white={selectedItemId === item.id}
                    on:click={() => onRemoveItem(item.id)}
                  >
                    <Icon icon="ph:x-light" size={Size.sm} />
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex-1 bg-bgs1 flex items-center justify-center">
    {#if selectedItemId}
      <div class="w-full h-full">
        <ResourceResolver
          id={selectedItemId.toString()}
          accessMode={ResourceAccessMode.INLINE}
        />
      </div>
    {:else}
      <div class="text-center text-fgs3">
        <Icon icon="ph:sidebar-light" size={Size.xl} class="mx-auto mb-4" />
        <div class="text-b2">
          Select an item from the sidebar to view it here
        </div>
      </div>
    {/if}
  </div>
</div>
