<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { resolveActiveNodeStore, type IActiveNodeStore } from "./node.store";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import { prefixTable } from "$lib/shared/utils/text.utils";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { NodeType } from "./node.type";
  import MediaNode from "./base/MediaNode.svelte";
  import NonMediaNode from "./base/NonMediaNode.svelte";
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
  $: if (isRenderSplitView) {
    appStore.toggleSearchParam(
      appStore.isFSplit()
        ? ResourceAccessMode.FSPLIT
        : ResourceAccessMode.SPLIT,
      prefixTable(id, Resource.nodelinks)
    );
    setTimeout(() => {
      appStore.toggleSearchParam("blr", true);
    }, 100);
  }
  async function fetchNode() {
    isLoading = true;
    await node.fetch();
    isLoading = false;
  }
</script>

{#if $node && !isLoading}
  {#if $node.contentType === NodeType.IMAGE || $node.contentType === NodeType.AUDIO || $node.contentType === NodeType.VIDEO}
    <MediaNode {node} {accessMode} />
  {:else}
    <NonMediaNode {node} {accessMode} />
  {/if}
{:else}
  <div class="w-full h-full pt-4 px-20">
    <NodeLoadingPulse />
  </div>
{/if}
