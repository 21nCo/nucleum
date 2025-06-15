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
  import { onMount } from "svelte";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCombinationContextMenu } from "../combination.store";
  import { Placement } from "$lib/client/types/direction.enum";
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
  let mindmapElement: HTMLElement;
  let mindmapScale = 1;
  let mindmapOffset = { x: 0, y: 0 };
  let expandedNodes: Set<IRecordId> = new Set();
  let layoutPositions: Map<IRecordId, { x: number; y: number; level: number }> =
    new Map();
  let connections: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }> = [];

  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 80;
  const LEVEL_SPACING = 250;
  const SIBLING_SPACING = 100;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 2;

  interface LayoutNode extends ICombinationItem {
    level: number;
    index: number;
    totalSiblings: number;
  }

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

  function calculateMindmapLayout(items: ICombinationItem[]): void {
    layoutPositions.clear();
    connections = [];

    if (items.length === 0) return;

    const rootItem = items[0];
    const rootX = 400;
    const rootY = 300;

    layoutPositions.set(rootItem.id, { x: rootX, y: rootY, level: 0 });

    if (rootItem.children && expandedNodes.has(rootItem.id)) {
      layoutChildren(rootItem.children, rootX, rootY, 1, 0);
    }
  }

  function layoutChildren(
    children: ICombinationItem[],
    parentX: number,
    parentY: number,
    level: number,
    parentAngle: number
  ): void {
    const totalChildren = children.length;
    const angleStep = totalChildren > 1 ? (2 * Math.PI) / totalChildren : 0;

    children.forEach((child, index) => {
      const angle = parentAngle + index * angleStep;
      const distance = LEVEL_SPACING;

      const x = parentX + Math.cos(angle) * distance;
      const y = parentY + Math.sin(angle) * distance;

      layoutPositions.set(child.id, { x, y, level });

      connections.push({
        from: { x: parentX, y: parentY },
        to: { x, y }
      });

      if (child.children && expandedNodes.has(child.id)) {
        layoutChildren(child.children, x, y, level + 1, angle);
      }
    });
  }

  async function loadItems() {
    if (!$combination?.items || $combination.items.length === 0) {
      items = [];
      return;
    }

    items = $combination.items;
    await loadResourceData(items);

    if (items.length > 0) {
      expandedNodes.add(items[0].id);
    }

    calculateMindmapLayout(items);
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

  async function onRemoveItem(id: IRecordId) {
    try {
      const newItems = removeItemById(items, id);
      await updateItems(newItems);
      if (selectedItemId === id) {
        selectedItemId = null;
      }
      expandedNodes.delete(id);
      toasts.success("Item removed");
    } catch (e) {
      toasts.error("Failed to remove item");
    }
  }

  function onItemSelect(id: IRecordId) {
    selectedItemId = id;
    appStore.openResource(id, ResourceAccessMode.INLINE);
  }

  function onToggleExpanded(id: IRecordId) {
    if (expandedNodes.has(id)) {
      expandedNodes.delete(id);
    } else {
      expandedNodes.add(id);
    }
    expandedNodes = expandedNodes;
    calculateMindmapLayout(items);
    saveMindmapConfig();
  }

  function getResourceIcon(type: string) {
    switch (type) {
      case "node":
        return "ph:article-light";
      case "goal":
        return "ph:target-light";
      case "task":
        return "ph:check-square-light";
      case "collection":
        return "ph:brackets-round-light";
      default:
        return "ph:file-light";
    }
  }

  function handleMindmapMouseDown(event: MouseEvent) {
    if (event.target === mindmapElement) {
      selectedItemId = null;

      let isPanning = false;
      const startMousePos = { x: event.clientX, y: event.clientY };
      const startOffset = { ...mindmapOffset };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isPanning) {
          const distance = Math.sqrt(
            Math.pow(e.clientX - startMousePos.x, 2) +
              Math.pow(e.clientY - startMousePos.y, 2)
          );
          if (distance > 5) {
            isPanning = true;
            mindmapElement.style.cursor = "grabbing";
          }
        }

        if (isPanning) {
          mindmapOffset.x = startOffset.x + (e.clientX - startMousePos.x);
          mindmapOffset.y = startOffset.y + (e.clientY - startMousePos.y);
          mindmapOffset = mindmapOffset;
        }
      };

      const handleMouseUp = () => {
        if (isPanning) {
          saveMindmapConfig();
          mindmapElement.style.cursor = "";
        }
        isPanning = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  }

  function handleMindmapWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, mindmapScale * delta)
    );
    mindmapScale = newScale;
    saveMindmapConfig();
  }

  async function saveMindmapConfig() {
    if (
      $combination?.config?.mindmapScale !== mindmapScale ||
      $combination?.config?.mindmapOffset?.x !== mindmapOffset.x ||
      $combination?.config?.mindmapOffset?.y !== mindmapOffset.y ||
      JSON.stringify($combination?.config?.expandedNodes || []) !==
        JSON.stringify(Array.from(expandedNodes))
    ) {
      await combination.modify({
        config: {
          ...($combination.config || {}),
          mindmapScale,
          mindmapOffset,
          expandedNodes: Array.from(expandedNodes)
        }
      });
    }
  }

  function getAllNodesFlattened(items: ICombinationItem[]): ICombinationItem[] {
    const result: ICombinationItem[] = [];

    function traverse(nodeItems: ICombinationItem[]) {
      nodeItems.forEach((item) => {
        result.push(item);
        if (item.children) {
          traverse(item.children);
        }
      });
    }

    traverse(items);
    return result;
  }

  onMount(() => {
    const savedScale = $combination?.config?.mindmapScale;
    const savedOffset = $combination?.config?.mindmapOffset;
    const savedExpandedNodes = $combination?.config?.expandedNodes;

    if (savedScale && savedScale >= MIN_SCALE && savedScale <= MAX_SCALE) {
      mindmapScale = savedScale;
    }

    if (savedOffset) {
      mindmapOffset = savedOffset;
    }

    if (savedExpandedNodes) {
      expandedNodes = new Set(savedExpandedNodes);
    }

    loadItems();
  });

  $: if ($combination) {
    loadItems();
    titleValue = $combination?.label || "";
  }

  $: allNodes = getAllNodesFlattened(items);
</script>

<div class="flex h-full w-full bg-bgs1">
  <div class="flex flex-col w-full">
    <div
      class="p-4 border-b border-brs2 bg-bgs2 flex items-center justify-between"
    >
      {#if isEditingTitle}
        <TextInput
          bind:value={titleValue}
          style={InputStyle.FILLED}
          placeholder="Mindmap title"
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
        <button
          class="text-left text-fgs1 text-b1 font-medium hover:text-aps1 transition-colors"
          on:click={() => (isEditingTitle = true)}
        >
          {$combination?.label || "Untitled Mindmap"}
        </button>
      {/if}

      <div class="flex items-center gap-2">
        {#if $combination?.isInEditMode}
          <Button
            label="Add existing"
            icon="ph:plus-light"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
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
            />
          </div>
        {/if}

        <div class="flex items-center gap-1 text-fgs3 text-b3">
          <Icon icon="ph:magnifying-glass-minus-light" size={Size.xs} />
          <span>{Math.round(mindmapScale * 100)}%</span>
          <Icon icon="ph:magnifying-glass-plus-light" size={Size.xs} />
        </div>

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
    </div>

    <div class="flex flex-1 overflow-hidden">
      <div
        class="flex-1 relative overflow-hidden bg-bgs1"
        bind:this={mindmapElement}
        on:mousedown={handleMindmapMouseDown}
        on:wheel={handleMindmapWheel}
      >
        <div
          class="absolute inset-0"
          style="transform: scale({mindmapScale}) translate({mindmapOffset.x}px, {mindmapOffset.y}px);"
        >
          <svg class="absolute inset-0 w-full h-full pointer-events-none">
            {#each connections as connection}
              <line
                x1={connection.from.x + NODE_WIDTH / 2}
                y1={connection.from.y + NODE_HEIGHT / 2}
                x2={connection.to.x + NODE_WIDTH / 2}
                y2={connection.to.y + NODE_HEIGHT / 2}
                stroke="rgb(var(--color-brs2-rgb))"
                stroke-width="2"
                opacity="0.6"
              />
            {/each}
          </svg>

          {#each allNodes as item (item.id)}
            {@const position = layoutPositions.get(item.id)}
            {@const resourceData = itemResourceData.get(item.id.toString())}
            {@const displayLabel =
              item.customLabel || resourceData?.label || "Untitled"}
            {@const hasChildren = item.children && item.children.length > 0}
            {@const isExpanded = expandedNodes.has(item.id)}
            {@const isRoot = items.length > 0 && items[0].id === item.id}

            {#if position}
              <div
                class={cn(
                  "absolute bg-bgs2 border border-brs2 rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-md transition-all group",
                  {
                    "ring-2 ring-aps1": selectedItemId === item.id,
                    "border-aps1 bg-aps1 text-abg": isRoot,
                    "hover:border-aps1": !isRoot
                  }
                )}
                style="left: {position.x}px; top: {position.y}px; width: {NODE_WIDTH}px; min-height: {NODE_HEIGHT}px;"
                on:click={() => onItemSelect(item.id)}
              >
                <div class="flex items-center gap-2 mb-2">
                  {#if hasChildren}
                    <button
                      class={cn(
                        "flex-shrink-0 p-0.5 rounded hover:bg-bgs3 transition-colors",
                        {
                          "hover:bg-white/10": isRoot
                        }
                      )}
                      on:click|stopPropagation={() => onToggleExpanded(item.id)}
                    >
                      <Icon
                        icon={isExpanded ? "ph:minus-light" : "ph:plus-light"}
                        size={Size.xs}
                        class={cn({
                          "text-abg": isRoot,
                          "text-fgs3": !isRoot
                        })}
                      />
                    </button>
                  {:else}
                    <div class="w-4 flex-shrink-0"></div>
                  {/if}

                  <Icon
                    icon={getResourceIcon(resourceData?.type)}
                    size={Size.sm}
                    class={cn("flex-shrink-0", {
                      "text-abg": isRoot,
                      "text-fgs2": !isRoot
                    })}
                  />

                  <span
                    class={cn("text-b3 font-medium truncate", {
                      "text-abg": isRoot,
                      "text-fgs1": !isRoot
                    })}
                  >
                    {displayLabel}
                  </span>

                  {#if $combination?.isInEditMode && !isRoot}
                    <button
                      class="ml-auto opacity-0 group-hover:opacity-100 text-fgs3 hover:text-red-500 transition-all"
                      on:click|stopPropagation={() => onRemoveItem(item.id)}
                    >
                      <Icon icon="ph:x-light" size={Size.xs} />
                    </button>
                  {/if}
                </div>

                {#if resourceData?.description}
                  <div
                    class={cn("text-b4 line-clamp-2", {
                      "text-abg/80": isRoot,
                      "text-fgs3": !isRoot
                    })}
                  >
                    {resourceData.description}
                  </div>
                {/if}

                {#if position.level > 0}
                  <div
                    class="absolute -top-2 -right-2 bg-aps1 text-abg text-xs px-1.5 py-0.5 rounded-full"
                  >
                    L{position.level}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        {#if items.length === 0}
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center text-fgs3">
              <Icon
                icon="ph:tree-view-light"
                size={Size.xl}
                class="mx-auto mb-4"
              />
              <div class="text-b2 mb-2">Your mindmap is empty</div>
              <div class="text-b4">
                Add items to start creating your mindmap
              </div>
            </div>
          </div>
        {/if}
      </div>

      {#if selectedItemId}
        <div class="w-96 bg-bgs2 border-l border-brs2 flex-shrink-0">
          <div class="w-full h-full">
            <ResourceResolver
              id={selectedItemId.toString()}
              accessMode={ResourceAccessMode.INLINE}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
