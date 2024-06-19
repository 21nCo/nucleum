<script lang="ts">
  import TodayButton from "$lib/client/elements/button/TodayButton.svelte";
  import TimelineDate from "$lib/client/elements/datetime/TimelineDate.svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import TimelineItems from "./TimelineItems.svelte";
  export let parentBgIndex: number = 0;
  export let context: "journal" | "journal-modal-viewer" = "journal";
  let nodeCount: number | undefined = undefined;
</script>

<div class="h-full w-full flex flex-col gap-4 items-start">
  <div class="flex justify-between w-full">
    <div class="flex gap-4 items-center">
      <TimelineDate />
      {#if nodeCount}
        <div>
          <div
            class={cn(
              "rounded-md text-b3 px-2 py-1 min-w-fit",
              bg(parentBgIndex)
            )}
          >
            {nodeCount}
            {nodeCount > 1 ? "entries" : "entry"}
          </div>
        </div>
      {/if}
    </div>
    <TodayButton parentBackgroundIndex={parentBgIndex} />
  </div>
  <div class="flex-grow w-full">
    <TimelineItems {parentBgIndex} {context} bind:nodeCount />
  </div>
</div>
