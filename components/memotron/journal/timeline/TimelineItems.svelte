<script lang="ts">
  import { NodePersistance } from "$lib/tidy/stores/node.persistance";
  import { MemotronEvent } from "$lib/local/types/event.enum";
  import EmptyStatusView from "$lib/tidy/elements/feedback/EmptyStatusView.svelte";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import { toggleSearchParam } from "$lib/tidy/utils/browser.utils";
  import { runAction } from "$lib/tidy/utils/utils";
  import NodeThumbnailView from "../../common/NodeThumbnailTimeline.svelte";
  import type { NodeThumbnail } from "$lib/tidy/types/node.type";
  export let context: "journal" | "journal-modal-viewer" = "journal";
  export let parentBackgroundIndex: number = 0;
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
    <div class="flex flex-col gap-8 w-full h-full overflow-auto pb-40">
      {#each nodes as node}
        <NodeThumbnailView
          {node}
          parentBackgrounIndex={parentBackgroundIndex}
          on:click={() => {
            toggleSearchParam("node", node.id);
            if (context === "journal")
              runAction(MemotronEvent.JOURNAL_MODAL_VIEWER);
          }}
        />
      {/each}
    </div>
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      mainText="No journal entries"
      subText="Please select a different date to see entries"
    />
  {/if}
</div>
