<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { CombinationNavItemType, type ICombinationNavItem } from "./combination.type";
  import { ActiveCombinationStore } from "./combination.store";
  import SideNavCombinationNavItem from "./SideNavCombinationNavItem.svelte";
  import SideNavCombinationResourcePicker from "./SideNavCombinationResourcePicker.svelte";
  import CombinationResourceRenderer from "./CombinationResourceRenderer.svelte";
  import CombinationTOC from "./CombinationTOC.svelte";
  import { findItemPath, getItemByPath } from "./combination.utils";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";

  export let id: IRecordId;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
  export let isEmbedded: boolean = false;
  export let visitedCombinationIds: Set<string> = new Set();

  const combinationStore = ActiveCombinationStore.resolve(id);
  let combination = $combinationStore;
  let selectedItemId: string | null = null;
  let editingItemId: string | null = null;
  let collapsedItemIds: Set<string> = new Set();
  let newSectionLabel = "";
  let isInitializing = true;
  let draggedItemId: string | null = null;
  let isRootDragOver = false;

  $: combination = $combinationStore;
  $: isEditMode = combination?.isInEditMode ?? false;
  $: items = combination?.items ?? [];
  $: selectedItem = resolveNavItem(selectedItemId);
  $: selectedResourceId =
    selectedItem?.type === CombinationNavItemType.RESOURCE
      ? selectedItem.resourceId
      : undefined;
  $: selectedResourceType =
    selectedItem?.type === CombinationNavItemType.RESOURCE
      ? selectedItem.resourceType
      : undefined;

  onMount(async () => {
    await combinationStore.init(accessMode);
    isInitializing = false;
  });

  onDestroy(() => {
    if (isEditMode) {
      combinationStore.toggleEditMode(false);
    }
  });

  $: if (!isInitializing && (!selectedItemId || !resolveNavItem(selectedItemId))) {
    const first = findFirstResource(items);
    selectedItemId = first?.id ?? null;
  }

  function resolveNavItem(itemId: string | null | undefined) {
    if (!itemId || !isValidArrayWithData(items)) return undefined;
    const path = findItemPath(items, itemId);
    if (!path) return undefined;
    return getItemByPath(items, path);
  }

  function findFirstResource(
    list: ICombinationNavItem[]
  ): ICombinationNavItem | undefined {
    for (const entry of list ?? []) {
      if (entry.type === CombinationNavItemType.RESOURCE) return entry;
      if (entry.children && entry.children.length > 0) {
        const nested = findFirstResource(entry.children);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  function toggleEditMode() {
    combinationStore.toggleEditMode(!isEditMode);
    if (isEditMode) {
      editingItemId = null;
    }
    draggedItemId = null;
    isRootDragOver = false;
  }

  function onSelectNavItem(item: ICombinationNavItem) {
    selectedItemId = item.id;
  }

  function onToggleCollapse(id: string) {
    const next = new Set(collapsedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    collapsedItemIds = next;
  }

  function onStartEdit(id: string) {
    editingItemId = id;
  }

  async function onEditLabel(event: { id: string; label: string }) {
    await combinationStore.updateNavItemLabel(event.id, event.label);
    editingItemId = null;
  }

  async function onDelete(id: string) {
    await combinationStore.deleteNavItem(id);
    editingItemId = null;
  }

  function onNavDragStart(id: string) {
    draggedItemId = id;
    isRootDragOver = false;
  }

  function onNavDragEnd() {
    draggedItemId = null;
    isRootDragOver = false;
  }

  async function onNavDrop(event: {
    itemId: string;
    targetId: string;
    position: "before" | "after" | "inside";
  }) {
    await combinationStore.moveNavItemRelative(event);
    draggedItemId = null;
    isRootDragOver = false;
  }

  function onLabelDebouncedChange(e: CustomEvent<string>) {
    combinationStore.updateLabel(e.detail);
  }

  async function addSection() {
    const trimmed = newSectionLabel.trim();
    if (!trimmed) return;
    const newId = await combinationStore.addSection({ label: trimmed });
    newSectionLabel = "";
    if (newId) {
      selectedItemId = newId;
    }
  }

  async function addResource(e: CustomEvent<{ item: any; resourceType: Resource }>) {
    const detail = e.detail;
    if (!detail?.item?.id) return;
    const parentId = resolveTargetParentId();
    const newId = await combinationStore.addResource({
      resourceId: detail.item.id,
      resourceType: detail.resourceType,
      parentId,
      label: detail.item.label ?? detail.item.name
    });
    if (parentId) {
      const next = new Set(collapsedItemIds);
      next.delete(parentId);
      collapsedItemIds = next;
    }
    if (newId) {
      selectedItemId = newId;
    }
  }

  function resolveTargetParentId() {
    if (!selectedItem) return undefined;
    if (selectedItem.type === CombinationNavItemType.SECTION) {
      return selectedItem.id;
    }
    const path = findItemPath(items, selectedItem.id);
    if (!path || path.length === 0) return undefined;
    const parentPath = path.slice(0, -1);
    if (parentPath.length === 0) return undefined;
    const parent = getItemByPath(items, parentPath);
    return parent?.id;
  }

  $: visitedForRenderer = (() => {
    const next = new Set(visitedCombinationIds);
    next.add(id.toString());
    return next;
  })();

  function onRootDragOver(event: DragEvent) {
    if (!isEditMode || !draggedItemId) return;
    event.preventDefault();
    isRootDragOver = true;
  }

  function onRootDragLeave() {
    if (!isEditMode) return;
    isRootDragOver = false;
  }

  async function onRootDrop(event: DragEvent) {
    if (!isEditMode || !draggedItemId) return;
    event.preventDefault();
    await combinationStore.moveNavItemToParent({
      itemId: draggedItemId,
      parentId: undefined,
      index: items.length
    });
    draggedItemId = null;
    isRootDragOver = false;
  }
</script>

<div class="flex h-full w-full overflow-hidden">
  <aside
    class={cn(
      "flex flex-col w-80 min-w-[18rem] max-w-[20rem] h-full border-r border-brs3 bg-bgs1 gap-4 p-4",
      {
        "w-72 min-w-[16rem]": isEmbedded
      }
    )}
  >
    <header class="flex flex-col gap-2">
      {#if isEditMode}
        <TextInput
          value={combination?.label ?? "Untitled combination"}
          size={Size.md}
          on:debouncedChange={onLabelDebouncedChange}
        />
      {:else}
        <h1 class="text-h4 font-semibold truncate">{combination?.label ?? "Untitled combination"}</h1>
      {/if}
      <div class="flex items-center gap-2">
        <Button
          size={Size.sm}
          icon={isEditMode ? "check" : "edit"}
          label={isEditMode ? "Done" : "Edit"}
          type={isEditMode ? ButtonVariant.PRIMARY : ButtonVariant.SECONDARY}
          on:click={toggleEditMode}
        />
        <Button
          size={Size.sm}
          icon="refresh"
          label="Refresh"
          style={ButtonStyle.PLAIN}
          type={ButtonVariant.SECONDARY}
          on:click={() => combinationStore.init(accessMode)}
        />
      </div>
    </header>
    <section class="flex-1 overflow-auto rounded-md border border-brs3">
      {#if !isValidArrayWithData(items)}
        <div class="flex h-full items-center justify-center">
          <EmptyStatusView
            mainText="No items yet"
            subText={isEditMode
              ? "Add resources or sections to build the navigation"
              : "Switch to edit mode to start building this combination"}
            isSearchContext={false}
          />
        </div>
      {:else}
        <div class="flex flex-col py-2">
          {#each items as navItem}
            <SideNavCombinationNavItem
              item={navItem}
              depth={0}
              activeItemId={selectedItemId}
              {isEditMode}
              collapsedItems={collapsedItemIds}
              {editingItemId}
              {draggedItemId}
              on:select={(e) => onSelectNavItem(e.detail)}
              on:toggle={(e) => onToggleCollapse(e.detail)}
              on:startEdit={(e) => onStartEdit(e.detail)}
              on:edit={(e) => onEditLabel(e.detail)}
              on:delete={(e) => onDelete(e.detail)}
              on:dragstart={(e) => onNavDragStart(e.detail)}
              on:dragend={() => onNavDragEnd()}
              on:drop={(e) => onNavDrop(e.detail)}
            />
          {/each}
        </div>
        {#if isEditMode && (draggedItemId || !isValidArrayWithData(items))}
          <div
            class={cn(
              "mx-2 my-2 py-2 rounded-md border border-dashed text-center text-b3 transition-colors",
              {
                "border-aps1 text-aps1 bg-aps3/30": isRootDragOver,
                "border-brs3 text-fgs3": !isRootDragOver
              }
            )}
            on:dragover={onRootDragOver}
            on:dragleave={onRootDragLeave}
            on:drop={onRootDrop}
          >
            Drop here to add to top level
          </div>
        {/if}
      {/if}
    </section>
    {#if isEditMode}
      <section class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <span class="text-b3 text-fgs3 uppercase">Add resource</span>
          <SideNavCombinationResourcePicker on:select={addResource} />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-b3 text-fgs3 uppercase">Add section</span>
          <TextInput
            bind:value={newSectionLabel}
            placeholder="New section"
            size={Size.sm}
            isShowSaveControl={true}
            on:save={addSection}
            on:enter={addSection}
          />
        </div>
      </section>
    {/if}
  </aside>
  <main class="flex-1 h-full overflow-hidden">
    <CombinationResourceRenderer
      resourceId={selectedResourceId}
      resourceType={selectedResourceType}
      accessMode={ResourceAccessMode.INLINE}
      parentCombinationId={id}
      visitedCombinationIds={visitedForRenderer}
    />
  </main>
  <aside class="hidden lg:flex flex-col w-64 min-w-[14rem] h-full border-l border-brs3 bg-bgs2 p-4">
    <CombinationTOC
      resourceId={selectedResourceId}
      resourceType={selectedResourceType}
    />
  </aside>
</div>
