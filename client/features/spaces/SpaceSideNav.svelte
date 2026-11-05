<script lang="ts">
  import { onDestroy, onMount, tick, type Snippet } from "svelte";
  import { toSvelteStore } from "@datafn/svelte";
  import { cn } from "@21n/ui/environment/presentation";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import {
    acquireDnDPage,
    appStore
  } from "@nucleum/shared-state/app-context/app.store";
  import {
    SpaceNavItemType,
    type ISpaceItemTarget,
    type ISpaceNavItem,
    type ISpaceResourceNavItem
  } from "@nucleum/features/spaces/space.type";
  import type {
    ISpaceNavContext,
    SpaceKeyboardMove
  } from "@nucleum/features/spaces/space-nav.type";
  import { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";
  import { confirmSpaceItemDelete } from "@nucleum/features/spaces/space.actions";
  import SpaceNavItem from "@nucleum/features/spaces/SpaceNavItem.svelte";
  import SpaceAddPanel from "@nucleum/features/spaces/SpaceAddPanel.svelte";
  import SpaceResourceRenderer from "@nucleum/features/spaces/SpaceResourceRenderer.svelte";
  import { scrollToHeading } from "@nucleum/features/spaces/space-heading-scroll";
  import {
    collectResourceItems,
    findItem,
    findParentId,
    isSpaceItemOpenable
  } from "@nucleum/features/spaces/space.utils";

  let {
    spaceId,
    focusChain,
    isEmbedded = false,
    header,
    onFocusSpace
  }: {
    spaceId: string;
    /** Spaces open above this one, from the root down. */
    focusChain: string[];
    isEmbedded?: boolean;
    header: Snippet;
    onFocusSpace: (spaceId: string) => void;
  } = $props();

  const store = ActiveSpaceStore.resolve(spaceId);
  const product = $derived($appStore.product);
  const items = $derived($store?.items ?? []);
  const isEditMode = $derived(Boolean($store?.isInEditMode));

  let selectedItemId = $state<string | null>(null);
  let activeHeadingId = $state<string | undefined>(undefined);
  let targetSectionId = $state<string | null>(null);
  let collapsedIds = $state(new Set<string>());
  let expandedIds = $state(new Set<string>());
  let editingItemId = $state<string | null>(null);
  let draggedItemId = $state<string | null>(null);
  let isRootDragOver = $state(false);
  let contentElement = $state<HTMLElement>();
  let scrollRequest = 0;
  let cancelScroll: (() => void) | undefined;
  let releaseDnDPage: (() => void) | undefined;

  const resourceIds = $derived(
    [
      ...new Set(
        collectResourceItems(items).map((item) => item.resourceId.toString())
      )
    ].sort()
  );
  const resourceIdsKey = $derived(resourceIds.join(","));
  const targetsStore = $derived.by(() => {
    const ids = resourceIdsKey ? resourceIdsKey.split(",") : [];
    const fields = ["id", "label", "avatar", "isArchived", "trashedAt"];
    return toSvelteStore<Record<string, ISpaceItemTarget>>(
      datafn.recordsByIdsSignal({
        ids,
        selectByResource: {
          [Resource.node]: [...fields, "contentType", "text"],
          [Resource.collection]: fields,
          [Resource.objective]: fields,
          [Resource.space]: fields
        },
        metadata: { includeTrashed: true, includeArchived: true }
      }),
      { initialData: {} }
    );
  });
  const targets = $derived($targetsStore.data ?? {});
  const isTargetsLoaded = $derived(!$targetsStore.loading);
  const selectedItem = $derived(
    selectedItemId ? findItem(items, selectedItemId) : undefined
  );
  const selectedResource = $derived(
    selectedItem?.type === SpaceNavItemType.RESOURCE
      ? (selectedItem as ISpaceResourceNavItem)
      : undefined
  );
  const targetSection = $derived(
    targetSectionId ? findItem(items, targetSectionId) : undefined
  );

  onMount(() => {
    releaseDnDPage = acquireDnDPage();
  });

  onDestroy(() => {
    releaseDnDPage?.();
    cancelHeadingScroll();
  });

  $effect(() => {
    if (!isEditMode) {
      editingItemId = null;
      targetSectionId = null;
      draggedItemId = null;
    }
  });

  $effect(() => {
    if (!isTargetsLoaded) return;
    const current = selectedItemId
      ? findItem(items, selectedItemId)
      : undefined;
    if (
      current?.type === SpaceNavItemType.RESOURCE &&
      isAutoOpenable(current as ISpaceResourceNavItem)
    )
      return;
    selectedItemId = findFirstOpenable(items)?.id ?? null;
    activeHeadingId = undefined;
    cancelHeadingScroll();
  });

  function isAutoOpenable(item: ISpaceResourceNavItem) {
    const target = targets[item.resourceId.toString()];
    return (
      item.resourceType !== Resource.space &&
      isSpaceItemOpenable(item.resourceType, product) &&
      !!target &&
      !target.trashedAt
    );
  }

  function findFirstOpenable(list: ISpaceNavItem[]) {
    return collectResourceItems(list).find(isAutoOpenable);
  }

  function cancelHeadingScroll() {
    scrollRequest++;
    cancelScroll?.();
    cancelScroll = undefined;
  }

  function openItem(item: ISpaceResourceNavItem) {
    selectedItemId = item.id;
    activeHeadingId = undefined;
    cancelHeadingScroll();
  }

  /** Opens a page and scrolls its content to a heading. */
  async function openHeading(item: ISpaceResourceNavItem, headingId: string) {
    selectedItemId = item.id;
    activeHeadingId = headingId;
    cancelHeadingScroll();
    const request = scrollRequest;
    await tick();
    if (request !== scrollRequest) return;
    cancelScroll = scrollToHeading(() => contentElement, headingId);
  }

  function focusSpace(item: ISpaceResourceNavItem) {
    onFocusSpace(item.resourceId.toString());
  }

  function selectSection(id: string) {
    if (isEditMode) targetSectionId = targetSectionId === id ? null : id;
    else toggle(id, true);
  }

  function toggle(id: string, isSection: boolean) {
    if (isSection) {
      const next = new Set(collapsedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      collapsedIds = next;
      return;
    }
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedIds = next;
  }

  async function rename(id: string, label: string) {
    editingItemId = null;
    await store.updateNavItemLabel(id, label);
  }

  function confirmDelete(item: ISpaceNavItem, label: string) {
    confirmSpaceItemDelete({
      store,
      item,
      label,
      onConfirm: () => {
        if (targetSectionId === item.id) targetSectionId = null;
      }
    });
  }

  async function addSection(parentId?: string) {
    const id = await store.addSection({ label: "New section", parentId });
    if (!id) return;
    if (parentId) {
      const next = new Set(collapsedIds);
      next.delete(parentId);
      collapsedIds = next;
    }
    editingItemId = id;
  }

  async function addRecord(
    record: {
      id: string;
      label: string;
      avatar?: IAvatar;
    },
    parentId: string | undefined
  ) {
    const newId = await store.addResource({
      resourceId: record.id,
      label: record.label,
      avatar: record.avatar,
      parentId
    });
    if (!newId) return;
    if (parentId) {
      const next = new Set(collapsedIds);
      next.delete(parentId);
      collapsedIds = next;
    }
    const added = findItem(store.readItems(), newId) as
      ISpaceResourceNavItem | undefined;
    if (
      added &&
      added.resourceType !== Resource.space &&
      isSpaceItemOpenable(added.resourceType, product)
    )
      openItem(added);
  }

  async function keyboardMove(id: string, move: SpaceKeyboardMove) {
    if (move === "up" || move === "down") await store.moveNavItem(id, move);
    else if (move === "indent") {
      await store.indentNavItem(id);
      const parentId = findParentId(store.readItems(), id);
      if (parentId && collapsedIds.has(parentId)) {
        const next = new Set(collapsedIds);
        next.delete(parentId);
        collapsedIds = next;
      }
    } else await store.outdentNavItem(id);
    await tick();
    document
      .querySelector<HTMLElement>(
        `li[data-id="${CSS.escape(id)}"] [data-role="space-item-main"]`
      )
      ?.focus();
  }

  async function drop(detail: {
    itemId: string;
    targetId: string;
    position: "before" | "after" | "inside";
  }) {
    draggedItemId = null;
    isRootDragOver = false;
    await store.moveNavItemRelative(detail);
  }

  function onRootDragOver(event: DragEvent) {
    if (!isEditMode || !draggedItemId) return;
    event.preventDefault();
    isRootDragOver = true;
  }

  async function onRootDrop(event: DragEvent) {
    if (!isEditMode || !draggedItemId) return;
    event.preventDefault();
    const itemId = draggedItemId;
    draggedItemId = null;
    isRootDragOver = false;
    await store.moveNavItemToParent({ itemId, parentId: undefined });
  }

  const nav: ISpaceNavContext = $derived({
    product,
    activeItemId: selectedItemId,
    activeHeadingId,
    isEditMode,
    targetSectionId,
    collapsedIds,
    expandedIds,
    editingItemId,
    draggedItemId,
    targets,
    isTargetsLoaded,
    loopIds: new Set([...focusChain, spaceId]),
    onOpen: openItem,
    onOpenHeading: openHeading,
    onFocusSpace: focusSpace,
    onSelectSection: selectSection,
    onToggle: toggle,
    onStartEdit: (id) => (editingItemId = id),
    onRename: rename,
    onCancelEdit: () => (editingItemId = null),
    onDelete: confirmDelete,
    onAddSection: addSection,
    onDragStart: (id) => {
      draggedItemId = id;
      isRootDragOver = false;
    },
    onDragEnd: () => {
      draggedItemId = null;
      isRootDragOver = false;
    },
    onDrop: drop,
    onKeyboardMove: keyboardMove
  });
</script>

<div class="flex h-full w-full overflow-hidden" data-testid="space-sidenav">
  <aside
    class={cn(
      "flex flex-col h-full shrink-0 border-r border-brs3 bg-bgs1 gap-3",
      {
        "w-80 min-w-[18rem] max-w-[20rem]": !isEmbedded,
        "w-72 min-w-[16rem]": isEmbedded
      }
    )}
    aria-label="Space navigation"
  >
    {@render header()}
    <nav class="flex-1 overflow-auto w-full" aria-label="Space items">
      {#if items.length === 0}
        <div class="flex h-full items-center justify-center px-3">
          <EmptyStatusView
            mainText="No items yet"
            subText={isEditMode
              ? "Search below to add pages, collections, goals or other spaces"
              : "Choose Edit items to start building this space"}
            isSearchContext={false}
          />
        </div>
      {:else}
        <ul class="flex flex-col py-1 w-full" data-testid="space-nav-tree">
          {#each items as navItem (navItem.id)}
            <SpaceNavItem item={navItem} depth={0} {nav} />
          {/each}
        </ul>
        {#if isEditMode && draggedItemId}
          <div
            role="region"
            aria-label="Drop here to move to the top level"
            class={cn(
              "mx-2 my-2 py-2 rounded-md border border-dashed text-center text-b3 transition-colors",
              {
                "border-aps1 text-aps1 bg-aps3/30": isRootDragOver,
                "border-brs3 text-fgs3": !isRootDragOver
              }
            )}
            ondragover={onRootDragOver}
            ondragleave={() => (isRootDragOver = false)}
            ondrop={onRootDrop}
          >
            Drop here to move to the top level
          </div>
        {/if}
      {/if}
    </nav>
    {#if isEditMode}
      <SpaceAddPanel
        class="px-3 pb-3"
        {product}
        {spaceId}
        {focusChain}
        {items}
        {targetSection}
        hint="Drag rows to rearrange. With a row focused, Alt and the arrow keys move it."
        onClearTarget={() => (targetSectionId = null)}
        onSelect={addRecord}
        onAddSection={() =>
          addSection(targetSection ? targetSectionId! : undefined)}
      />
    {/if}
  </aside>
  <main
    class="flex-1 min-w-0 h-full overflow-auto"
    bind:this={contentElement}
    data-testid="space-content"
  >
    <SpaceResourceRenderer
      resourceId={selectedResource?.resourceId}
      resourceType={selectedResource?.resourceType}
    />
  </main>
</div>
