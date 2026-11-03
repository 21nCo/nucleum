<script lang="ts">
  import type { Snippet } from "svelte";
  import { toSvelteDataStore, toSvelteStore } from "@datafn/svelte";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { datafnHeavyComputedSignalOptions } from "@nucleum/datafn/signalCache";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import {
    SpaceNavItemType,
    type ISpaceNavItem,
    type ISpaceResourceNavItem
  } from "@nucleum/features/spaces/space.type";
  import { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";
  import { confirmSpaceItemDelete } from "@nucleum/features/spaces/space.actions";
  import {
    collectResourceItems,
    findItem
  } from "@nucleum/features/spaces/space.utils";
  import { scrollToHeading } from "@nucleum/features/spaces/space-heading-scroll";
  import SpaceAddPanel from "@nucleum/features/spaces/SpaceAddPanel.svelte";
  import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";
  import { groupWallItems } from "@nucleum/features/spaces/wall/space-wall.utils";
  import SpaceWallGrid from "@nucleum/features/spaces/wall/SpaceWallGrid.svelte";
  import SpaceWallGroup from "@nucleum/features/spaces/wall/SpaceWallGroup.svelte";

  let {
    spaceId,
    focusChain,
    header,
    onFocusSpace
  }: {
    spaceId: string;
    /** Spaces open above this one, from the root down. */
    focusChain: string[];
    header: Snippet;
    onFocusSpace: (spaceId: string) => void;
  } = $props();

  const store = ActiveSpaceStore.resolve(spaceId);
  const product = $derived($appStore.product);
  const items = $derived($store?.items ?? []);
  const isEditMode = $derived(Boolean($store?.isInEditMode));
  const level = $derived(groupWallItems(items));

  let targetSectionId = $state<string | null>(null);
  let editingSectionId = $state<string | null>(null);
  let cancelScroll: (() => void) | undefined;

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
    return toSvelteStore<Record<string, Record<string, unknown>>>(
      datafn.recordsByIdsSignal({
        ids,
        selectByResource: {
          [Resource.node]: [
            "*",
            "file.*",
            "collections.type",
            "collections.avatar",
            "collections.typeToExtend.avatar"
          ],
          [Resource.collection]: [
            "*",
            "properties.*",
            "views.*",
            "typeToExtend.*"
          ],
          [Resource.objective]: ["*", "parent.*", "children.*", "tasks.*"],
          [Resource.space]: ["*"]
        },
        metadata: { includeTrashed: true, includeArchived: true }
      }),
      { initialData: {} }
    );
  });
  const collectionIds = $derived(
    resourceIds.filter((id) => id.startsWith(`${Resource.collection}:`))
  );
  const collectionCountsStore = $derived.by(() =>
    toSvelteDataStore(
      datafn.relationCountsSignal(
        {
          resource: Resource.collection,
          relation: "items",
          ids: collectionIds,
          targetFilters: {
            isArchived: { $ne: true },
            trashedAt: { $is_null: true },
            isAncestorInactive: { $ne: true }
          }
        },
        datafnHeavyComputedSignalOptions
      ),
      { initialData: {} }
    )
  );
  const targetSection = $derived(
    targetSectionId ? findItem(items, targetSectionId) : undefined
  );

  $effect(() => {
    if (!isEditMode) {
      editingSectionId = null;
      targetSectionId = null;
    }
  });

  function openItem(item: ISpaceResourceNavItem) {
    cancelScroll?.();
    cancelScroll = undefined;
    navigation.openResource(item.resourceId, AccessMode.PAGE);
  }

  /** Opens a page over the space and scrolls it to a heading once it renders. */
  function openHeading(item: ISpaceResourceNavItem, headingId: string) {
    openItem(item);
    cancelScroll = scrollToHeading(() => document, headingId);
  }

  function selectSection(id: string) {
    targetSectionId = targetSectionId === id ? null : id;
  }

  async function rename(id: string, label: string) {
    editingSectionId = null;
    await store.updateNavItemLabel(id, label);
  }

  function confirmDelete(item: ISpaceNavItem, label: string) {
    confirmSpaceItemDelete({
      store,
      item,
      label,
      onConfirm: () => {
        if (item.type !== SpaceNavItemType.SECTION) return;
        if (targetSectionId && findItem([item], targetSectionId))
          targetSectionId = null;
      }
    });
  }

  async function addSection(parentId?: string) {
    editingSectionId = await store.addSection({
      label: "New section",
      parentId
    });
  }

  async function addRecord(
    record: {
      id: string;
      label: string;
      avatar?: IAvatar;
    },
    parentId: string | undefined
  ) {
    await store.addResource({
      resourceId: record.id,
      label: record.label,
      avatar: record.avatar,
      parentId
    });
  }

  const wall: ISpaceWallContext = $derived({
    spaceId,
    product,
    isEditMode,
    targetSectionId,
    editingSectionId,
    targets: $targetsStore.data ?? {},
    isTargetsLoaded: !$targetsStore.loading,
    collectionCounts: ($collectionCountsStore ?? {}) as Record<string, number>,
    loopIds: new Set([...focusChain, spaceId]),
    onOpen: openItem,
    onOpenHeading: openHeading,
    onFocusSpace: (item) => onFocusSpace(item.resourceId.toString()),
    onSelectSection: selectSection,
    onStartEdit: (id) => (editingSectionId = id),
    onRename: rename,
    onCancelEdit: () => (editingSectionId = null),
    onDelete: confirmDelete,
    onAddSection: addSection
  });
</script>

<div class="flex flex-col h-full w-full overflow-auto" data-testid="space-wall">
  <div class="w-full shrink-0">
    {@render header()}
  </div>
  <div class="flex flex-col gap-8 w-full px-3 sm:px-6 pt-4 pb-12">
    {#if isEditMode}
      <SpaceAddPanel
        class="w-full max-w-md"
        {product}
        {spaceId}
        {focusChain}
        {items}
        {targetSection}
        hint="Select a section title to add items into it."
        onClearTarget={() => (targetSectionId = null)}
        onSelect={addRecord}
        onAddSection={() =>
          addSection(targetSection ? targetSectionId! : undefined)}
      />
    {/if}
    {#if items.length === 0}
      <div class="flex flex-1 items-center justify-center py-12">
        <EmptyStatusView
          mainText="No items yet"
          subText={isEditMode
            ? "Search above to add pages, collections, goals or other spaces"
            : "Choose Edit items to start building this space"}
          isSearchContext={false}
        />
      </div>
    {:else}
      {#if level.resources.length > 0}
        <SpaceWallGrid items={level.resources} {wall} />
      {/if}
      {#each level.groups as group (group.section.id)}
        <SpaceWallGroup {group} {wall} />
      {/each}
    {/if}
  </div>
</div>
