<script lang="ts">
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import { NodeThumbnailVariant } from "$lib/client/types/memotron/node.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import NodeItemsView from "../../common/NodeItemsView.svelte";
  import { resolveActiveCurationStore } from "../curation.store";
  export let id: string;
  let arrangement = NodeThumbnailVariant.LIST;
  $: collection = resolveActiveCurationStore(id);
</script>

<div class="w-full flex-grow flex justify-center items-center p-2">
  <!-- Temporary default view -->
  {#if !$collection.isRefreshing && "views" in $collection && isValidArrayWithData($collection.views?.[0]?.data)}
    <NodeItemsView nodes={$collection.views[0].data} {arrangement} />
  {:else if $collection.isRefreshing}
    <PageLoadingPulse />
  {:else}
    content
  {/if}
</div>
