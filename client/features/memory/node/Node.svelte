<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import NodeLoadingPulse from "@21n/ui/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { ActiveNodeStore } from "@nucleum/features/memory/node/node.store";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@nucleum/datafn/resource.type";
  import {
    mediaNodeTypeList,
    NodeView,
    webNodeTypeList
  } from "@nucleum/features/memory/node/node.type";
  import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
  import MediaNode from "@nucleum/features/memory/node/base/MediaNode.svelte";
  import NonMediaNode from "@nucleum/features/memory/node/base/NonMediaNode.svelte";
  import { onDestroy, onMount, setContext, untrack } from "svelte";

  import { debouncer } from "@21n/shared-utils/debounce";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { acquireDnDPage } from "@nucleum/shared-state/app-context/app.store";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import { page } from "$app/stores";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import ComponentEmbedLayer from "@nucleum/shell/layers/ComponentEmbedLayer.svelte";
  import context from "@nucleum/client/runtime/context.store";
  import NodePanelSwitcher from "./floatingBar/NodePanelSwitcher.svelte";
  import { resolvePanelParam } from "@nucleum/shared-state/resources/panelParam.mixin";
  import { ResourcePanelType } from "@nucleum/shared-state/resources/resource-panel.type";
  import { Context } from "@nucleum/shared-state/app-context/app-store.type";
  import { getContext } from "svelte";
  import { get, readable, type Writable } from "svelte/store";
  import type { IContainer } from "@nucleum/shell/layout.type";
  import { resolveNodeMinWidth } from "@nucleum/features/memory/node/node-layout";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { toSvelteStore } from "@datafn/svelte";

  const container =
    getContext<Writable<IContainer | undefined>>(Context.CONTAINER) ||
    readable(undefined);

  let {
    id,
    accessMode,
    isFromSplitView = false
  }: {
    id: string;
    accessMode?: AccessMode;
    isFromSplitView?: boolean;
  } = $props();
  let view = $state<NodeView>(NodeView.CONTENT);
  let isShowFloatingBar = $state(true);

  let nodeViewParam = $derived(
    navigation.resolveRecordSpecificSearchParam(id, AppSearchParam.NODE_VIEW)
  );
  $effect(() => {
    const currentView = $page.url?.searchParams?.get(nodeViewParam);
    if (currentView) {
      view = currentView as NodeView;
    }
  });
  let isRenderSplitView = false;
  let node = $derived(ActiveNodeStore.resolve(id));
  let isConstrainedWidth = $derived(
    !!$container &&
      $container.width <
        resolveNodeMinWidth(
          {
            contentType: $node?.contentType,
            panel: $node?.panel,
            isInFocusMode: $node?.isInFocusMode
          },
          resolveRootFontSize()
        )
  );

  function resolveRootFontSize() {
    return (
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    );
  }

  let isLoading = $state(false);
  let error = $state<any>(undefined);
  let initializedId: string | undefined;
  /**
   * Load the node when it (or the split view) changes. initialize() reads
   * other state such as accessMode synchronously, so it runs untracked:
   * otherwise an access-mode change shortly after opening re-fetched the
   * whole node, its links and clips a second time.
   */
  $effect(() => {
    if (id && (isFromSplitView || !isRenderSplitView)) {
      if (initializedId === id) return;
      initializedId = id;
      untrack(() => initialize());
    }
  });
  /**
   * Sets the loaded node's access mode to that of the newest mounted view of
   * it (this one's when it is the only one), so a view that finishes loading
   * late doesn't overwrite the mode of a view opened after it.
   */
  function applyAccessMode() {
    const mode = ActiveNodeStore.resolveOwnerAccessMode(id) ?? accessMode;
    if ($node && $node.accessMode !== mode) {
      node.update((current) => ({ ...current, accessMode: mode }));
    }
  }
  /** Keep the loaded node's access mode current without re-fetching it. */
  $effect(() => {
    accessMode;
    untrack(() => applyAccessMode());
  });
  navigation.clearAllTooltips();

  async function initialize(ctx?: string) {
    logger.log({ at: "Node.initialize", id, ctx });
    isLoading = true;
    const panel = resolvePanelParam(id, get(page)?.url, "Node.svelte");
    const result = await node.init({
      accessMode,
      accessPoint: ResourceAccessPoint.SELF,
      panel: (panel as ResourcePanelType | undefined) ?? undefined
    });
    if (result && "error" in result) {
      error = result.error;
      isLoading = false;
      return;
    }
    applyAccessMode();
    nodeContext.parent = $node?.parent;
    nodeContext.contentType = $node?.contentType;
    isLoading = false;
    await node.afterInit();
  }

  function contextEventListener(message: any) {}
  const nodeContext = {
    id,
    contentType: $node?.contentType,
    parent: $node?.parent,
    publish: contextEventListener
  };

  setContext(Context.NODE, nodeContext);

  let releaseDnDPage: (() => void) | undefined;

  onMount(() => {
    releaseDnDPage = acquireDnDPage();
  });

  onDestroy(() => {
    releaseDnDPage?.();
  });

  $effect(() => ActiveNodeStore.retain(id, () => accessMode));

  const debouncedInitialize = debouncer(initialize, 1500);
  /** The latest-changed property seen so far ("none" when there are none). */
  let lastPropertyKey: string | undefined;

  const propertyStore = toSvelteStore(
    datafn.property.signal({
      limit: 1,
      sort: ["-updatedAt"],
      metadata: {
        includeTrashed: true,
        includeArchived: true
      }
    })
  );

  /**
   * Re-initialise when a property actually changes (to show new property
   * values). Compare the latest property instead of counting emissions: the
   * store emits its empty initial value and then the loaded one, which used to
   * look like a change and re-fetched the whole node 1.5 s after opening.
   */
  $effect(() => {
    if ($propertyStore.loading) return;
    const latest = ($propertyStore.data as any[] | undefined)?.[0];
    const key = latest ? `${latest.id}:${latest.updatedAt}` : "none";
    untrack(() => {
      if (lastPropertyKey === undefined) {
        lastPropertyKey = key;
        return;
      }
      if (key === lastPropertyKey) return;
      lastPropertyKey = key;
      debouncedInitialize();
    });
  });
</script>

{#if error}
  <EmptyStatusView mainText={error} isSearchContext={true} />
{:else if $node && !isLoading}
  <div class="w-full h-full relative">
    {#if [...mediaNodeTypeList, ...webNodeTypeList].includes($node.contentType)}
      <MediaNode {node} {accessMode} nodeView={view} {isConstrainedWidth} />
    {:else}
      <NonMediaNode
        {node}
        bind:isShowFloatingBar
        selectedView={view}
        {isConstrainedWidth}
      />
    {/if}
    <NodePanelSwitcher
      {node}
      {accessMode}
      {isConstrainedWidth}
      isFloatingHidden={!isShowFloatingBar}
    />
  </div>
{:else}
  <div class="w-full h-full otop:pt-12 pt-4 mo:px-4 px-20">
    <NodeLoadingPulse />
  </div>
{/if}
{#if $context.isEmbed && accessMode !== AccessMode.PAGE && !isFromSplitView}
  <ComponentEmbedLayer isBackNavigable={true} />
{/if}
