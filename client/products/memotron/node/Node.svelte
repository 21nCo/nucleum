<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { ActiveNodeStore, type IActiveNodeStore } from "./node.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { mediaNodeTypeList, NodeView, webNodeTypeList } from "./node.type";
  import MediaNode from "./base/MediaNode.svelte";
  import NonMediaNode from "./base/NonMediaNode.svelte";
  import { onDestroy, setContext } from "svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { debouncer } from "$lib/client/utils/utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { appStore } from "$lib/client/stores/app.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { page } from "$app/stores";
  import { AppSearchParam } from "$lib/client/types/appStore.type";

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
    ActiveNodeStore.destroy(id);
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
  <div class="w-full h-full pt-4 mo:px-4 px-20">
    <NodeLoadingPulse />
  </div>
{/if}
<ComponentBaseLayer
  hasDragAndDrop={true}
  subscribeToResource={new Set([Resource.property])}
  on:change={debouncedInitialize}
/>
