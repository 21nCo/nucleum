<script lang="ts">
  import type { ActiveCombinationStore } from "../combination.store";
  import type { ICombinationItem } from "../combination.type";
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
  import { resizable } from "$lib/client/actions/resize.action";
  import { onMount } from "svelte";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCombinationContextMenu } from "../combination.store";
  import { Placement } from "$lib/client/types/direction.enum";
  import SideNavItem from "../SideNavItem.svelte";
  import { cn } from "$lib/client/utils/ui.utils";

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
  let items: ICombinationItem[] = [];
  let itemResourceData: Map<IRecordId, any> = new Map();
  let selectedItemId: IRecordId | null = null;
  let sideNavWidth = 320;
  let sideNavElement: HTMLElement;
  let expandedItems: Set<IRecordId> = new Set();

  const DEFAULT_WIDTH = 320;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;

  async function loadResourceData(
    combinationItems: ICombinationItem[]
  ): Promise<void> {
    const allIds = extractAllIds(combinationItems);
    if (allIds.length === 0) return;

    try {
      const searchStore = new SearchStore();
      const results = await searchStore.select({
        filters: { id: allIds }
      });

      if (results) {
        itemResourceData.clear();
        results.forEach((resource: any) => {
          itemResourceData.set(resource.id.toString(), resource);
        });
        itemResourceData = itemResourceData;
      }
    } catch (e) {
      console.error("Error loading resource data:", e);
    }
  }

  function extractAllIds(items: ICombinationItem[]): IRecordId[] {
    const ids: IRecordId[] = [];
    items.forEach((item) => {
      ids.push(item.id);
      if (item.children) {
        ids.push(...extractAllIds(item.children));
      }
    });
    return ids;
  }

  async function loadItems() {
    if (!$combination?.items || $combination.items.length === 0) {
      items = [];
      return;
    }

    items = $combination.items;
    await loadResourceData(items);
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

  function onCreateNew(resource: Resource) {
    appStore.runResourceAction(resource, ResourceActionType.CREATE);
  }

  async function updateItems(newItems: ICombinationItem[]) {
    await combination.modify({ items: newItems });
    await loadItems();
  }

  function findItemById(
    items: ICombinationItem[],
    id: IRecordId
  ): ICombinationItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  function removeItemById(
    items: ICombinationItem[],
    id: IRecordId
  ): ICombinationItem[] {
    return items.filter((item) => {
      if (item.id === id) return false;
      if (item.children) {
        item.children = removeItemById(item.children, id);
      }
      return true;
    });
  }

  function updateItemLabel(
    items: ICombinationItem[],
    id: IRecordId,
    label: string
  ): ICombinationItem[] {
    return items.map((item) => {
      if (item.id === id) {
        return { ...item, customLabel: label };
      }
      if (item.children) {
        return { ...item, children: updateItemLabel(item.children, id, label) };
      }
      return item;
    });
  }

  function addSubItem(
    items: ICombinationItem[],
    parentId: IRecordId,
    newItem: ICombinationItem
  ): ICombinationItem[] {
    return items.map((item) => {
      if (item.id === parentId) {
        const children = item.children || [];
        return { ...item, children: [...children, newItem] };
      }
      if (item.children) {
        return {
          ...item,
          children: addSubItem(item.children, parentId, newItem)
        };
      }
      return item;
    });
  }

  async function onRemoveItem(id: IRecordId) {
    try {
      const newItems = removeItemById(items, id);
      await updateItems(newItems);
      if (selectedItemId === id) {
        selectedItemId = null;
      }
      toasts.success("Item removed");
    } catch (e) {
      toasts.error("Failed to remove item");
    }
  }

  async function onUpdateLabel(event: CustomEvent) {
    try {
      const { id, label } = event.detail;
      const newItems = updateItemLabel(items, id, label);
      await updateItems(newItems);
      toasts.success("Label updated");
    } catch (e) {
      toasts.error("Failed to update label");
    }
  }

  function onItemSelect(event: CustomEvent) {
    const id = event.detail;
    selectedItemId = id;
    appStore.openResource(id, ResourceAccessMode.INLINE);
  }

  function onItemExpand(event: CustomEvent) {
    const { id, expanded } = event.detail;
    if (expanded) {
      expandedItems.add(id);
    } else {
      expandedItems.delete(id);
    }
    expandedItems = expandedItems;
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

  $: console.log({ items, itemResourceData });
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
                onSelect: onCreateNew
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
          {#each items as item (item.id)}
            <SideNavItem
              {item}
              {selectedItemId}
              isInEditMode={$combination?.isInEditMode || false}
              level={0}
              expanded={expandedItems.has(item.id)}
              itemResourceDataMap={itemResourceData}
              on:select={onItemSelect}
              on:expand={onItemExpand}
              on:updateLabel={onUpdateLabel}
              on:remove={(e) => onRemoveItem(e.detail)}
            />
          {/each}
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
