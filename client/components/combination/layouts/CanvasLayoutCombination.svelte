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
  import { onMount, onDestroy } from "svelte";
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
  let canvasElement: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let canvasContainer: HTMLElement;

  // Canvas state
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let draggedItem: ICombinationItem | null = null;
  let isPanning = false;
  let lastMousePos = { x: 0, y: 0 };
  let animationId: number | null = null;

  const DEFAULT_ITEM_SIZE = { width: 200, height: 120 };
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 2;

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
      render();
      return;
    }

    items = $combination.items.map((item) => ({
      ...item,
      position: item.position || {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      },
      size: item.size || DEFAULT_ITEM_SIZE
    }));

    await loadResourceData(items);
    render();
  }

  function getResourceColor(type: string): string {
    switch (type) {
      case "node":
        return "#3b82f6";
      case "goal":
        return "#ef4444";
      case "task":
        return "#10b981";
      case "collection":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  }

  function worldToScreen(x: number, y: number) {
    return {
      x: (x + offsetX) * scale,
      y: (y + offsetY) * scale
    };
  }

  function screenToWorld(x: number, y: number) {
    return {
      x: x / scale - offsetX,
      y: y / scale - offsetY
    };
  }

  function getItemAt(x: number, y: number): ICombinationItem | null {
    const worldPos = screenToWorld(x, y);

    for (const item of items) {
      const pos = item.position || { x: 0, y: 0 };
      const size = item.size || DEFAULT_ITEM_SIZE;

      if (
        worldPos.x >= pos.x &&
        worldPos.x <= pos.x + size.width &&
        worldPos.y >= pos.y &&
        worldPos.y <= pos.y + size.height
      ) {
        return item;
      }
    }
    return null;
  }

  function render() {
    if (!ctx || !canvasElement) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Set transform
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(offsetX, offsetY);

    // Draw grid
    drawGrid();

    // Draw items
    items.forEach((item) => {
      drawItem(item);
    });

    ctx.restore();

    // Draw UI elements (unscaled)
    if (items.length === 0) {
      drawEmptyState();
    }
  }

  function drawGrid() {
    const gridSize = 20;
    const startX = Math.floor(-offsetX / gridSize) * gridSize;
    const startY = Math.floor(-offsetY / gridSize) * gridSize;
    const endX = startX + canvasElement.width / scale + gridSize;
    const endY = startY + canvasElement.height / scale + gridSize;

    ctx.strokeStyle = "rgba(156, 163, 175, 0.2)";
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();

    for (let x = startX; x < endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }

    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }

    ctx.stroke();
  }

  function drawItem(item: ICombinationItem) {
    const pos = item.position || { x: 0, y: 0 };
    const size = item.size || DEFAULT_ITEM_SIZE;
    const resourceData = itemResourceData.get(item.id.toString());
    const displayLabel = item.customLabel || resourceData?.label || "Untitled";
    const isSelected = selectedItemId === item.id;

    // Draw background
    ctx.fillStyle = isSelected
      ? "#f59e0b"
      : getResourceColor(resourceData?.type);
    ctx.strokeStyle = isSelected ? "#d97706" : "#ffffff";
    ctx.lineWidth = isSelected ? 3 / scale : 1 / scale;

    const radius = 8 / scale;
    ctx.beginPath();
    ctx.roundRect(pos.x, pos.y, size.width, size.height, radius);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = "#ffffff";
    ctx.font = `${14 / scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const padding = 12 / scale;
    const maxWidth = size.width - padding * 2;
    const lines = wrapText(displayLabel, maxWidth);

    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        pos.x + padding,
        pos.y + padding + (index * 18) / scale
      );
    });

    // Draw description
    if (resourceData?.description) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = `${12 / scale}px system-ui, -apple-system, sans-serif`;
      const descLines = wrapText(resourceData.description, maxWidth);
      const descStart =
        pos.y + padding + (lines.length * 18) / scale + 8 / scale;

      descLines.slice(0, 2).forEach((line, index) => {
        ctx.fillText(line, pos.x + padding, descStart + (index * 16) / scale);
      });
    }
  }

  function wrapText(text: string, maxWidth: number): string[] {
    if (!ctx) return [text];

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function drawEmptyState() {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "16px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Your canvas is empty",
      canvasElement.width / 2,
      canvasElement.height / 2 - 10
    );
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      "Add items to start organizing them visually",
      canvasElement.width / 2,
      canvasElement.height / 2 + 15
    );
  }

  function handleMouseDown(event: MouseEvent) {
    const rect = canvasElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    lastMousePos = { x: mouseX, y: mouseY };

    const clickedItem = getItemAt(mouseX, mouseY);

    if (clickedItem) {
      selectedItemId = clickedItem.id;
      if ($combination?.isInEditMode) {
        draggedItem = clickedItem;
        isDragging = true;
      }
      appStore.openResource(clickedItem.id, ResourceAccessMode.INLINE);
    } else {
      selectedItemId = null;
      isPanning = true;
    }

    render();
  }

  function handleMouseMove(event: MouseEvent) {
    const rect = canvasElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const deltaX = mouseX - lastMousePos.x;
    const deltaY = mouseY - lastMousePos.y;

    if (isDragging && draggedItem) {
      const worldDelta = {
        x: deltaX / scale,
        y: deltaY / scale
      };

      const newItems = updateItemPosition(items, draggedItem.id, {
        x: (draggedItem.position?.x || 0) + worldDelta.x,
        y: (draggedItem.position?.y || 0) + worldDelta.y
      });

      items = newItems;
      draggedItem = items.find((item) => item.id === draggedItem!.id) || null;
      render();
    } else if (isPanning) {
      offsetX += deltaX / scale;
      offsetY += deltaY / scale;
      render();
    }

    lastMousePos = { x: mouseX, y: mouseY };
  }

  function handleMouseUp() {
    if (isDragging && draggedItem) {
      updateItems(items);
    }

    isDragging = false;
    draggedItem = null;
    isPanning = false;
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();

    const rect = canvasElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldPosBefore = screenToWorld(mouseX, mouseY);

    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * scaleFactor));

    const worldPosAfter = screenToWorld(mouseX, mouseY);

    offsetX += worldPosAfter.x - worldPosBefore.x;
    offsetY += worldPosAfter.y - worldPosBefore.y;

    render();
  }

  function handleContextMenu(event: MouseEvent) {
    if (!$combination?.isInEditMode) return;

    event.preventDefault();
    const rect = canvasElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const clickedItem = getItemAt(mouseX, mouseY);
    if (clickedItem) {
      if (confirm("Remove this item from the canvas?")) {
        onRemoveItem(clickedItem.id);
      }
    }
  }

  function resizeCanvas() {
    if (!canvasElement || !canvasContainer) return;

    const rect = canvasContainer.getBoundingClientRect();
    canvasElement.width = rect.width;
    canvasElement.height = rect.height;
    render();
  }

  function fitView() {
    if (items.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    items.forEach((item) => {
      const pos = item.position || { x: 0, y: 0 };
      const size = item.size || DEFAULT_ITEM_SIZE;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size.width);
      maxY = Math.max(maxY, pos.y + size.height);
    });

    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scaleX = canvasElement.width / contentWidth;
    const scaleY = canvasElement.height / contentHeight;
    scale = Math.min(scaleX, scaleY, 1);

    offsetX =
      -minX + padding + (canvasElement.width / scale - contentWidth) / 2;
    offsetY =
      -minY + padding + (canvasElement.height / scale - contentHeight) / 2;

    render();
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

  function updateItemPosition(
    items: ICombinationItem[],
    id: IRecordId,
    position: { x: number; y: number }
  ): ICombinationItem[] {
    return items.map((item) => {
      if (item.id === id) {
        return { ...item, position };
      }
      if (item.children) {
        return {
          ...item,
          children: updateItemPosition(item.children, id, position)
        };
      }
      return item;
    });
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
      toasts.success("Item removed");
    } catch (e) {
      toasts.error("Failed to remove item");
    }
  }

  onMount(() => {
    if (canvasElement) {
      ctx = canvasElement.getContext("2d")!;
      resizeCanvas();
      loadItems();

      window.addEventListener("resize", resizeCanvas);
    }
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener("resize", resizeCanvas);
  });

  $: if ($combination) {
    loadItems();
    titleValue = $combination?.label || "";
  }
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
          placeholder="Canvas title"
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
          {$combination?.label || "Untitled Canvas"}
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
          <span>{Math.round(scale * 100)}%</span>
          <Icon icon="ph:magnifying-glass-plus-light" size={Size.xs} />
        </div>

        <Button
          label="Fit view"
          icon="ph:arrows-out-light"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={fitView}
        />

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
      <div class="flex-1 relative bg-bgs1" bind:this={canvasContainer}>
        <canvas
          bind:this={canvasElement}
          class="w-full h-full cursor-crosshair"
          on:mousedown={handleMouseDown}
          on:mousemove={handleMouseMove}
          on:mouseup={handleMouseUp}
          on:wheel={handleWheel}
          on:contextmenu={handleContextMenu}
        ></canvas>
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
  .bg-grid-pattern {
    background-image: linear-gradient(
        rgba(var(--color-brs2-rgb), 0.3) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(var(--color-brs2-rgb), 0.3) 1px,
        transparent 1px
      );
    background-size: 20px 20px;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
