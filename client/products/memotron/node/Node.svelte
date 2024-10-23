<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { ActiveNodeStore, type IActiveNodeStore } from "./node.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { mediaNodeTypeList, webNodeTypeList } from "./node.type";
  import MediaNode from "./base/MediaNode.svelte";
  import NonMediaNode from "./base/NonMediaNode.svelte";
  import { onDestroy, setContext } from "svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { debouncer } from "$lib/client/utils/utils";
  import { logger } from "$lib/client/components/debug/logger.client";

  export let id: string;
  export let accessMode: ResourceAccessMode;

  export let isFromSplitView: boolean = false;
  let isRenderSplitView = false;
  // $: isRenderSplitView =
  //   !isFromSplitView && $view.width > 1500 && $view.scale > 1.5;
  let node: IActiveNodeStore;
  // $: if (id) node = resolveActiveNodeStore(id);
  $: if (id) node = ActiveNodeStore.resolve(id);
  let isLoading = false;
  $: if (id && (isFromSplitView || !isRenderSplitView)) {
    initialize();
  }

  async function initialize(ctx?: string) {
    logger.log({ at: "Node.initialize", id, ctx });
    isLoading = true;
    await node.init(accessMode);
    nodeContext.parent = $node?.parent;
    isLoading = false;
  }

  function contextEventListener(message: any) {}
  const nodeContext = {
    parent: $node?.parent,
    publish: contextEventListener
  };

  setContext("node", nodeContext);

  onDestroy(() => {
    ActiveNodeStore.destroy(id);
  });
  const debouncedInitialize = debouncer(initialize, 1500);
</script>

{#if $node && !isLoading}
  {#if [...mediaNodeTypeList, ...webNodeTypeList].includes($node.contentType)}
    <MediaNode {node} />
  {:else}
    <NonMediaNode {node} />
  {/if}
{:else}
  <div class="w-full h-full pt-4 mo:px-4 px-20">
    <NodeLoadingPulse />
  </div>
{/if}
<ComponentBaseLayer
  hasDragAndDrop={true}
  subscribeTo={[Resource.property]}
  on:change={debouncedInitialize}
/>
