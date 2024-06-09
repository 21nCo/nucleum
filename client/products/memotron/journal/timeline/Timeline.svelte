<script lang="ts">
  import TodayButton from "$lib/client/elements/button/TodayButton.svelte";
  import TimelineDate from "$lib/client/elements/datetime/TimelineDate.svelte";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { bgClass } from "$lib/client/utils/theme.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
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
          <BackgroundElement
            class="rounded-md text-b3 px-2 py-1 min-w-fit"
            {parentBgIndex}
            >{nodeCount} {nodeCount > 1 ? "entries" : "entry"}
          </BackgroundElement>
        </div>
      {/if}
    </div>
    <TodayButton parentBackgroundIndex={parentBgIndex} />
  </div>
  <div class="flex-grow w-full">
    <TimelineItems {parentBgIndex} {context} bind:nodeCount />
  </div>
</div>
