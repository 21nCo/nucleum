<script lang="ts">
  import PageLoadingPulse from "$lib/tidy/elements/feedback/animations/PageLoadingPulse.svelte";
  import { toggleSearchParam } from "$lib/tidy/utils/browser.utils";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import { runAction } from "$lib/tidy/utils/utils";
  import NodeThumbnail from "../../common/NodeThumbnailTimeline.svelte";
  import { resolveActiveCurationStore } from "../curation.store";
  export let id: string;
  $: collection = resolveActiveCurationStore(id);
</script>

<div class="w-full grow flex justify-center items-center p-2">
  <!-- Temporary default view -->
  {#if !$collection.isRefreshing && "views" in $collection && isValidArrayWithData($collection.views?.[0]?.data)}
    <div class="flex flex-col h-full w-full justify-start gap-4">
      {#each $collection.views[0].data as item}
        <span class="w-full">
          <!-- <NodeThumbnail
            id={item}
            on:click={() => {
              toggleSearchParam("node", item);
              runAction(MemotronEvent.JOURNAL_MODAL_VIEWER);
            }}
          /> -->
        </span>
      {/each}
    </div>
  {:else if $collection.isRefreshing}
    <PageLoadingPulse />
  {:else}
    content
  {/if}
</div>
