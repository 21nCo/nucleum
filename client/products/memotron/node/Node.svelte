<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { resolveActiveNodeStore, type IActiveNodeStore } from "./node.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { mediaNodeTypeList, webNodeTypeList } from "./node.type";
  import MediaNode from "./base/MediaNode.svelte";
  import NonMediaNode from "./base/NonMediaNode.svelte";
  import { setContext } from "svelte";
  import PageLayer from "$lib/client/layout/layers/PageLayer.svelte";

  export let id: string;
  export let accessMode: ResourceAccessMode;

  console.log({ id, accessMode });
  export let isFromSplitView: boolean = false;
  let isRenderSplitView = false;
  // $: isRenderSplitView =
  //   !isFromSplitView && $view.width > 1500 && $view.scale > 1.5;
  let node: IActiveNodeStore;
  $: if (id) node = resolveActiveNodeStore(id);
  let isLoading = false;
  $: if (id && (isFromSplitView || !isRenderSplitView)) {
    fetchNode();
  }

  async function fetchNode() {
    isLoading = true;
    await node.fetch();
    nodeContext.parent = $node.parent;
    isLoading = false;
  }

  function contextEventListener(message: any) {}
  const nodeContext = {
    parent: $node?.parent,
    publish: contextEventListener
  };

  setContext("node", nodeContext);
</script>

{#if $node && !isLoading}
  {#if [...mediaNodeTypeList, ...webNodeTypeList].includes($node.contentType)}
    <MediaNode {node} {accessMode} />
  {:else}
    <NonMediaNode {node} {accessMode} />
  {/if}
{:else}
  <div class="w-full h-full pt-4 px-20">
    <NodeLoadingPulse />
  </div>
{/if}
<PageLayer isDragAndDropPage={true} />
