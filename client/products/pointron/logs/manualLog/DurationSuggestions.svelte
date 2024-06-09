<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let selectedItem: number = 0;
  onMount(() => {
    $pointronPreferences.manualEntryQuickDurations = [];
    if (
      !$pointronPreferences.manualEntryQuickDurations ||
      $pointronPreferences.manualEntryQuickDurations.length === 0
    ) {
      $pointronPreferences.manualEntryQuickDurations = [10, 15, 30, 60, 120];
    }
  });
</script>

{#if $pointronPreferences.manualEntryQuickDurations && $pointronPreferences.manualEntryQuickDurations.length > 0}
  <div class="flex-col items-start flex w-full gap-2">
    <FormControlLabel props={{ label: "Quick add" }} />
    <div class="w-full flex justify-between gap-3 pr-10 overflow-x-auto">
      {#each $pointronPreferences.manualEntryQuickDurations as item}
        <ActiveBackgroundElement
          class="px-4 py-1 rounded-md min-w-fit bg-bgs2 hover:bg-bgs3"
          isBackgroundActive={item === selectedItem}
          on:click={() => {
            selectedItem = item;
            dispatch("select", item);
          }}
        >
          last
          {formatSeconds(item * 60)}
        </ActiveBackgroundElement>
      {/each}
    </div>
  </div>
{/if}
