<script lang="ts">
  import NodeLoadingPulse from "@21n/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { ActiveNodeStore, type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import { mediaNodeTypeList, NodeView, webNodeTypeList } from "@21n/products/memotron/node/node.type";
  import MediaNode from "@21n/products/memotron/node/base/MediaNode.svelte";
  import NonMediaNode from "@21n/products/memotron/node/base/NonMediaNode.svelte";
  import { onDestroy, setContext } from "svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { debouncer } from "@21n/utils/utils";
  import { logger } from "@21n/components/debug/logger.client";
  import { appStore } from "@21n/stores/app.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { page } from "$app/stores";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import ComponentEmbedLayer from "@21n/layout/layers/ComponentEmbedLayer.svelte";
  import context from "@21n/stores/context.store";

  export let id: string;
  export let accessMode: ResourceAccessMode;

  export let isFromSplitView: boolean = false;
  let view: NodeView = NodeView.CONTENT;
  const nodeViewParam = appStore.resolveRecordSpecificSearchParam(
    id,
    AppSearchParam.NODE_VIEW
  );
  $: if ($page.url?.searchParams?.get(nodeViewParam)) {
    view = $page.url?.searchParams?.get(nodeViewParam) as NodeView;
  }
  let isRenderSplitView = false;
  // $: isRenderSplitView =
  //   !isFromSplitView && $view.width > 1500 && $view.scale > 1.5;
  let node: IActiveNodeStore;
  // $: if (id) node = resolveActiveNodeStore(id);
  $: if (id) node = ActiveNodeStore.resolve(id);
  let isLoading = false;
  let error: any;
  $: if (id && (isFromSplitView || !isRenderSplitView)) {
    initialize();
  }
  appStore.clearAllTooltips();

  async function initialize(ctx?: string) {
    logger.log({ at: "Node.initialize", id, ctx });
    isLoading = true;
    const result = await node.init({
      accessMode,
      accessPoint: ResourceAccessPoint.SELF
    });
    if (result && "error" in result) {
      error = result.error;
      isLoading = false;
      return;
    }
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

  setContext("node", nodeContext);

  onDestroy(() => {
    ActiveNodeStore.destroy(id, accessMode);
  });
  const debouncedInitialize = debouncer(initialize, 1500);
</script>

{#if error}
  <EmptyStatusView mainText={error} isSearchContext={true} />
{:else if $node && !isLoading}
  {#if [...mediaNodeTypeList, ...webNodeTypeList].includes($node.contentType)}
    <MediaNode {node} nodeView={view} />
  {:else}
    <NonMediaNode {node} selectedView={view} />
  {/if}
{:else}
  <div class="w-full h-full otop:pt-12 pt-4 mo:px-4 px-20">
    <NodeLoadingPulse />
  </div>
{/if}
<ComponentBaseLayer
  hasDragAndDrop={true}
  subscribeToResource={new Set([Resource.property])}
  on:change={debouncedInitialize}
/>
{#if $context.isEmbed && accessMode !== ResourceAccessMode.POP && !isFromSplitView}
  <ComponentEmbedLayer isBackNavigable={true} />
{/if}
