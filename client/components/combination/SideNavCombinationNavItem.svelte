<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { hoverable } from "@21n/client/actions/hover.action";
  import Icon from "@21n/client/elements/Icon.svelte";
  import TextInput from "@21n/client/elements/input/TextInput.svelte";
  import AvatarRenderer from "@21n/client/elements/avatarPicker/AvatarRenderer.svelte";
  import { Size } from "@21n/client/types/size.enum";
  import { cn } from "@21n/client/utils/ui.utils";
  import { resolveResourceIcon } from "@21n/client/components/flux/resourceStores/resource.utils";
  import type { IAvatar } from "@21n/client/types/avatar.type";
  import {
    CombinationNavItemType,
    type ICombinationNavItem
  } from "./combination.type";

  export let item: ICombinationNavItem;
  export let depth: number = 0;
  export let activeItemId: string | null = null;
  export let isEditMode: boolean = false;
  export let collapsedItems: Set<string> = new Set();
  export let editingItemId: string | null = null;
  export let draggedItemId: string | null = null;

  const dispatch = createEventDispatcher();

  let editLabel = item.label;
  let avatar: IAvatar | undefined;
  let isHoveringItem = false;
  let dropPosition: "before" | "after" | "inside" | null = null;

  $: isCollapsed = collapsedItems.has(item.id);
  $: isEditing = isEditMode && editingItemId === item.id;
  $: isActive = activeItemId === item.id;
  $: avatar = resolveAvatar();
  $: resourceIcon =
    item.type === CombinationNavItemType.RESOURCE
      ? resolveResourceIcon(item.resourceType)
      : "folder";
  $: if (!isEditing) {
    editLabel = item.label;
  }

  function resolveAvatar(): IAvatar | undefined {
    if (item.avatar) return item.avatar;
    if (item.type === CombinationNavItemType.RESOURCE && item.resourceAvatar)
      return item.resourceAvatar;
    return undefined;
  }

  function onSelect(event: MouseEvent) {
    event.stopPropagation();
    if (item.type === CombinationNavItemType.RESOURCE) {
      dispatch("select", item);
    } else if (item.children && item.children.length > 0) {
      dispatch("toggle", item.id);
    }
  }

  function onChevronClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch("toggle", item.id);
  }

  function onSaveLabel(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    dispatch("edit", { id: item.id, label: trimmed });
  }

  function handleDragStart(event: DragEvent) {
    if (!isEditMode || isEditing) return;
    event.stopPropagation();
    event.dataTransfer?.setData("text/plain", item.id);
    dispatch("dragstart", item.id);
  }

  function handleDragEnd(event: DragEvent) {
    event.stopPropagation();
    dropPosition = null;
    dispatch("dragend", item.id);
  }

  function resolveDropPosition(event: DragEvent) {
    const element = event.currentTarget as HTMLElement;
    const { top, height } = element.getBoundingClientRect();
    const offsetY = event.clientY - top;
    const threshold = height / 4;
    if (offsetY < threshold) return "before" as const;
    if (offsetY > height - threshold) return "after" as const;
    return "inside" as const;
  }

  function handleDragOver(event: DragEvent) {
    if (!isEditMode || !draggedItemId || draggedItemId === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    const position = resolveDropPosition(event);
    dropPosition =
      position === "inside" && item.type !== CombinationNavItemType.SECTION
        ? "after"
        : position;
  }

  function handleDragLeave(event: DragEvent) {
    if (!isEditMode) return;
    if (
      !(event.currentTarget instanceof HTMLElement) ||
      !event.currentTarget.contains(event.relatedTarget as Node)
    ) {
      dropPosition = null;
    }
  }

  function handleDrop(event: DragEvent) {
    if (!isEditMode || !draggedItemId || draggedItemId === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    const position =
      dropPosition ??
      (item.type === CombinationNavItemType.SECTION ? "inside" : "after");
    dispatch("drop", {
      itemId: draggedItemId,
      targetId: item.id,
      position
    });
    dropPosition = null;
  }
</script>

<div class="flex flex-col w-full" data-id={item.id}>
  <button
    class={cn(
      "group flex items-center gap-2 px-2 py-2 transition-colors border-y",
      {
        "bg-bgs2 border-brs2": isActive,
        "hover:bg-bgs2-striped border-transparent": !isActive,
        "opacity-70 cursor-default":
          item.type === CombinationNavItemType.SECTION && !item.children?.length
      }
    )}
    draggable={isEditMode && !isEditing}
    use:hoverable={{
      onHover: (val) => (isHoveringItem = val)
    }}
    on:dragstart={handleDragStart}
    on:dragend={handleDragEnd}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    style={`padding-left: ${Math.min(depth * 1.25 + 0.75, 4)}rem;` +
      dropPosition ===
    "before"
      ? "box-shadow: inset 0 2px 0 0 var(--aps1);"
      : dropPosition === "after"
        ? "box-shadow: inset 0 -2px 0 0 var(--aps1);"
        : dropPosition === "inside"
          ? "box-shadow: inset 0 0 0 2px var(--aps1);"
          : undefined}
    on:click={onSelect}
  >
    {#if item.children && item.children.length > 0}
      <button
        type="button"
        aria-label={isCollapsed ? "Expand section" : "Collapse section"}
        class="flex items-center justify-center w-6 h-6 rounded-md hover:bg-bgs3"
        on:click={onChevronClick}
      >
        <Icon
          icon={isCollapsed ? "chevron-right" : "chevron-down"}
          class="stroke-fgs2"
          size={Size.sm}
        />
      </button>
    {:else}
      <span class="w-6" />
    {/if}
    {#if isEditMode && !isEditing}
      <Icon icon="rearrange" size={Size.sm} class="stroke-fgs3" />
    {/if}
    <div class="flex-1 min-w-0 text-left truncate">
      {#if isEditing}
        <TextInput
          bind:value={editLabel}
          size={Size.sm}
          on:save={(e) => onSaveLabel(e.detail.value)}
          on:enter={(e) => onSaveLabel(e.detail.value)}
          on:blur={() => onSaveLabel(editLabel)}
          isShowSaveControl={false}
        />
      {:else}
        <span class="truncate text-left text-b2">{item.label}</span>
      {/if}
    </div>
    {#if item.children && item.children.length > 0}
      <span class="text-b3 text-fgs3">{item.children.length}</span>
    {/if}
    {#if isEditMode}
      <div class="flex items-center gap-1">
        <button
          class="p-1 rounded-md hover:bg-bgs3"
          title="Rename"
          on:click={(e) => {
            e.stopPropagation();
            dispatch("startEdit", item.id);
          }}
        >
          <Icon icon="edit" size={Size.sm} class="stroke-fgs2" />
        </button>
        <button
          class={cn(
            "p-1 rounded-md hover:bg-bgs3 text-err transition-opacity",
            {
              "opacity-0 pointer-events-none": !isHoveringItem,
              "opacity-100": isHoveringItem
            }
          )}
          title="Remove"
          on:click={(e) => {
            e.stopPropagation();
            dispatch("delete", item.id);
          }}
        >
          <Icon icon="trash" size={Size.sm} class="stroke-err" />
        </button>
      </div>
    {/if}
  </button>

  {#if item.children && item.children.length > 0 && !isCollapsed}
    <div class="flex flex-col">
      {#each item.children as child}
        <svelte:self
          item={child}
          depth={depth + 1}
          {activeItemId}
          {isEditMode}
          {collapsedItems}
          {editingItemId}
          {draggedItemId}
          on:select={(e) => dispatch("select", e.detail)}
          on:toggle={(e) => dispatch("toggle", e.detail)}
          on:edit={(e) => dispatch("edit", e.detail)}
          on:startEdit={(e) => dispatch("startEdit", e.detail)}
          on:delete={(e) => dispatch("delete", e.detail)}
          on:dragstart={(e) => dispatch("dragstart", e.detail)}
          on:dragend={(e) => dispatch("dragend", e.detail)}
          on:drop={(e) => dispatch("drop", e.detail)}
        />
      {/each}
    </div>
  {/if}
</div>
