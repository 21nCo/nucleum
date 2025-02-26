<script lang="ts">
  import TimeComposition from "./composition/TimeComposition.svelte";
  import IntervalBar from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBar.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { focusItemsStore } from "$lib/client/products/pointron/focus/session.store";
  import { appStore } from "$lib/client/stores/app.store";
</script>

<div
  class="relative flex flex-col items-center gap-4 dp:gap-12 flex-grow w-full"
>
  <div class="flex flex-col gap-4 dp:gap-8 w-full flex-grow">
    <IntervalBar />
    <TimeComposition isExpandedMode={true} />
  </div>
  <button
    class="flex flex-col items-center gap-1 pb-40"
    on:click={() => appStore.runAction(PointronAction.SHOW_FOCUSITEMS_MODAL)}
  >
    <!-- TODO - count should ignore parent goal if tasks added -->
    <span class="underline-dotted">
      {$focusItemsStore.goals.length > 0
        ? $focusItemsStore.goals.length + " focus Items added"
        : "+ add focus items"}
    </span>
    {#if $focusItemsStore.goals.length > 0}
      <span class="text-b4 text-fgs3"> tap to edit </span>
    {/if}
  </button>
</div>
