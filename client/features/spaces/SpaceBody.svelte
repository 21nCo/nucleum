<script lang="ts">
  import { onMount } from "svelte";
  import { toSvelteStore } from "@datafn/svelte";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import type { AccessMode } from "@nucleum/datafn/resource.type";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import { SpaceView } from "@nucleum/features/spaces/space.type";
  import { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";
  import SpaceHeader from "@nucleum/features/spaces/SpaceHeader.svelte";
  import SpaceSideNav from "@nucleum/features/spaces/SpaceSideNav.svelte";
  import SpaceWall from "@nucleum/features/spaces/SpaceWall.svelte";
  import SpaceContextZone from "@nucleum/features/spaces/SpaceContextZone.svelte";
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
  import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    spaceId,
    parentId = undefined,
    ancestors,
    accessMode = undefined,
    isEmbedded = false,
    onBack,
    onFocusSpace
  }: {
    spaceId: string;
    /** Space one level up in the focus path, when this space is focused inside another. */
    parentId?: string;
    /** Spaces open above this one, from the root down. */
    ancestors: string[];
    accessMode?: AccessMode;
    isEmbedded?: boolean;
    onBack: () => void;
    onFocusSpace: (spaceId: string) => void;
  } = $props();

  const store = ActiveSpaceStore.resolve(spaceId);
  const isContextZoneHosted = contextZone.isHosted;
  const viewStore = $derived(
    ancestors.length ? ActiveSpaceStore.resolve(ancestors[0]) : store
  );
  const parentStore = $derived.by(() =>
    parentId
      ? toSvelteStore<{ id: string; label?: string }[]>(
          datafn.space.signal({
            filters: { id: parentId },
            select: ["id", "label"],
            metadata: { includeTrashed: true, includeArchived: true }
          }),
          { initialData: [] }
        )
      : undefined
  );
  let isLoaded = $state(false);
  const view = $derived($viewStore?.view ?? SpaceView.SIDENAV);
  const isPinned = $derived(appMenuStore.isSpacePinned(spaceId, $appMenuStore));
  const parentLabel = $derived(
    parentStore ? ($parentStore?.data?.[0]?.label ?? "") : undefined
  );
  const backActionText = $derived(
    parentId ? `Back to ${parentLabel || "Untitled space"}` : undefined
  );

  onMount(() => {
    Promise.all([
      store.init(accessMode),
      viewStore === store
        ? undefined
        : viewStore.init(undefined, { isRecordedInRecents: false })
    ]).then(() => (isLoaded = true));
    return () => {
      if ($store?.isInEditMode) store.setEditMode(false);
      if ($store?.isTitleEditing) store.setTitleEditing(false);
    };
  });

  function togglePin() {
    if (isPinned) appMenuStore.unpinSpace(spaceId);
    else appMenuStore.pinSpace(spaceId);
  }

  function changeView(next: SpaceView) {
    viewStore.updateView(next);
  }

  function cycleZone() {
    changeView(view === SpaceView.WALL ? SpaceView.SIDENAV : SpaceView.WALL);
  }
</script>

{#if isLoaded && !$store?.isMissing}
  <ContextZoneContent isInlineFallback={false} cycle={cycleZone}>
    <SpaceContextZone
      {store}
      {view}
      {parentLabel}
      onBack={parentId ? onBack : undefined}
      {isPinned}
      onTogglePin={togglePin}
      onViewChange={changeView}
    />
  </ContextZoneContent>
{/if}

{#snippet header()}
  <SpaceHeader
    {store}
    {parentLabel}
    onBack={parentId ? onBack : undefined}
    {view}
    {isPinned}
    isCompact={$isContextZoneHosted}
    onTogglePin={togglePin}
    onViewChange={changeView}
  />
{/snippet}

{#if !isLoaded}
  <div class="w-full h-full" data-testid="space-loading"></div>
{:else if $store?.isLoadFailed}
  <EmptyStatusView
    mainText="Could not load this space"
    subText="Reopen it to try again"
    isSearchContext={false}
    actionText={backActionText}
    onclick={parentId ? onBack : undefined}
  />
{:else if $store?.isMissing}
  <EmptyStatusView
    mainText="Space not found"
    subText="It may have been deleted or not synced to this device yet"
    isSearchContext={false}
    actionText={backActionText}
    onclick={parentId ? onBack : undefined}
  />
{:else if view === SpaceView.WALL}
  <SpaceWall {spaceId} focusChain={ancestors} {header} {onFocusSpace} />
{:else}
  <SpaceSideNav
    {spaceId}
    focusChain={ancestors}
    {isEmbedded}
    {header}
    {onFocusSpace}
  />
{/if}
