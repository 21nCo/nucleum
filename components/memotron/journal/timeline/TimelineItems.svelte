<script lang="ts">
  import { NodePersistance } from "$lib/tidy/stores/node.persistance";
  import EmptyStatusView from "$lib/tidy/elements/feedback/EmptyStatusView.svelte";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";

  import {
    NodeThumbnailVariant,
    type NodeThumbnail
  } from "$lib/tidy/types/memotron/node.type";
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
