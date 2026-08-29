<script lang="ts">
  import TimeComposition from "@21n/products/pointron/focus/advanced/composition/TimeComposition.svelte";
  import IntervalBar from "@21n/products/pointron/focus/elements/intervalbar/IntervalBar.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { focusItemsStore } from "@21n/products/pointron/focus/session.store";
  import { appStore } from "@21n/stores/app.store";
  import { advancedCompositionDraft } from "@21n/products/pointron/focus/advanced/composition/advancedCompositionDraft.store";
  let { parentBgIndex = 1 }: { parentBgIndex?: number } = $props();

  let focusItemsCount = $derived(
    focusItemsStore.resolveCount($focusItemsStore.items)
  );
</script>

<div
  class="relative flex flex-col items-center gap-4 dp:gap-12 flex-grow w-full"
>
  <div class="flex flex-col gap-4 dp:gap-8 w-full flex-grow">
    <IntervalBar composition={$advancedCompositionDraft} />
    <TimeComposition {parentBgIndex} />
  </div>
  <button
    class="flex flex-col items-center gap-1 cw:pb-40 pb-16"
    onclick={() => appStore.runAction(PointronAction.SHOW_FOCUSITEMS_MODAL)}
  >
    <span class="underline-dotted">
      {focusItemsCount > 0
        ? `${focusItemsCount} focus ${focusItemsCount === 1 ? "item" : "items"} added`
        : "+ add focus items"}
    </span>
    {#if focusItemsCount > 0}
      <span class="text-b4 text-fgs3"> tap to edit </span>
    {/if}
  </button>
</div>
