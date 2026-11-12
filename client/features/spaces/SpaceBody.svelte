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
  import { Resource } from "@nucleum/datafn/resource.enum";
  import ContextActions from "@nucleum/shell/topNav/contextZone/ContextActions.svelte";
  import { resolveSpacePageMenu } from "@nucleum/features/spaces/space-page-menu";
  import { withResourceActionKeys } from "@nucleum/features/records/resource-action-keys";
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
  const rootId = $derived(ancestors[0] ?? spaceId);
  const isRootPinned = $derived(
    appMenuStore.isSpacePinned(rootId, $appMenuStore)
  );
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
      if (viewStore !== store && $viewStore?.isTitleEditing) {
        viewStore.setTitleEditing(false);
      }
    };
  });

  function togglePin() {
    if (isPinned) appMenuStore.unpinSpace(spaceId);
    else appMenuStore.pinSpace(spaceId);
  }

  function toggleRootPin() {
    if (isRootPinned) appMenuStore.unpinSpace(rootId);
    else appMenuStore.pinSpace(rootId);
  }

  /**
   * The open space's menu for the super bar and its single-key letters. An
   * item opened inside the space registers its own menu later in the same
   * pane, so it takes precedence until it closes.
   */
  function resolveSpaceMenu() {
    if (!$viewStore) return [];
    return withResourceActionKeys(
      resolveSpacePageMenu($viewStore, {
        isPinned: isRootPinned,
        onRename: () => viewStore.setTitleEditing(true),
        onTogglePin: toggleRootPin,
        onChanged: () =>
          viewStore.init(undefined, { isRecordedInRecents: false })
      })
    );
  }

  function changeView(next: SpaceView) {
    viewStore.updateView(next);
  }

  function cycleZone() {
    changeView(view === SpaceView.WALL ? SpaceView.SIDENAV : SpaceView.WALL);
  }
</script>

{#if isLoaded && !$store?.isMissing && !isEmbedded}
  <ContextActions
    id={rootId}
    resource={Resource.space}
    resolve={resolveSpaceMenu}
  />
{/if}

{#if isLoaded && !$store?.isMissing}
  <ContextZoneContent isInlineFallback={false} cycle={cycleZone}>
    <SpaceContextZone
      store={viewStore}
      {view}
      isPinned={isRootPinned}
      onTogglePin={toggleRootPin}
      onViewChange={changeView}
      isKeyed={!isEmbedded}
    />
  </ContextZoneContent>
{/if}

{#snippet header()}
  <SpaceHeader
    {store}
    titleStore={viewStore}
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
