<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";

  import {
    NodeThumbnailVariant,
    type INodeThumbnail
  } from "$lib/client/products/memotron/node/node.type";
  import NodeItems from "$lib/client/products/memotron/node/NodeItems.svelte";
  import { nodeStore } from "../../node/node.store";
  export let context: "journal" | "journal-modal-viewer" = "journal";
  export let parentBgIndex: number = 0;
  export let nodes: INodeThumbnail[] = [];
  export let nodeCount: number | undefined = undefined;
  let isLoadingState = false;
  $: if ($selectedTimePeriod) refresh();

  async function refresh() {
    isLoadingState = true;
    nodes = [];
    const result = await nodeStore.fetchTimeline($selectedTimePeriod);
    if (isValidArrayWithData(result)) {
      nodes = result.sort(
        (a: INodeThumbnail, b: INodeThumbnail) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    nodeCount = nodes.length;
    isLoadingState = false;
  }
</script>

<div class="flex h-full w-full">
  {#if isValidArrayWithData(nodes) && !isLoadingState}
    <NodeItems
      {nodes}
      arrangement={NodeThumbnailVariant.LIST}
      {parentBgIndex}
    />
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      mainText="No journal entries"
      subText="Please select a different date to see entries"
    />
  {/if}
</div>
