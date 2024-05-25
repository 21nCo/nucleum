<script lang="ts">
  import { NodePersistance } from "$lib/client/stores/node.persistance";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";

  import {
    NodeThumbnailVariant,
    type NodeThumbnail
  } from "$lib/client/types/memotron/node.type";
  import NodeItemsView from "../../common/NodeItemsView.svelte";
  export let context: "journal" | "journal-modal-viewer" = "journal";
  export let parentBgIndex: number = 0;
  export let nodes: NodeThumbnail[] = [];
  export let nodeCount: number | undefined = undefined;
  let isLoadingState = false;
  $: if ($selectedTimePeriod) refresh();

  async function refresh() {
    isLoadingState = true;
    nodes = [];
    const result = await new NodePersistance().fetchTimeline(
      $selectedTimePeriod
    );
    if (isValidArrayWithData(result)) {
      nodes = result.sort(
        (a: NodeThumbnail, b: NodeThumbnail) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    nodeCount = nodes.length;
    isLoadingState = false;
  }
</script>

<div class="flex h-full w-full">
  {#if isValidArrayWithData(nodes) && !isLoadingState}
    <NodeItemsView
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
