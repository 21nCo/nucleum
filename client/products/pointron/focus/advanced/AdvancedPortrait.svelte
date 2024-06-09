<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import StartEndBar from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBar.svelte";
  import type { ButtonParams } from "$lib/client/types/button.type";
  import TimeComposition from "./composition/TimeComposition.svelte";
  import FocusItemList from "../elements/focusitem/FocusItemList.svelte";
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import IntervalBar from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBar.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { focusItemsStore } from "$lib/client/products/pointron/focus/session.store";
  import { appStore } from "$lib/client/stores/app.store";
</script>

<!-- <div class="flex flex-col gap-8 flex-grow w-full">
  <BackgroundElement class="flex flex-col p-4 gap-4 rounded-lg w-full">
    <div class="font-bold text-b2 flex w-full justify-center text-fgs3">
      Duration & intervals
    </div>
    <StartEndBar />
    <TimeSection />
  </BackgroundElement>
  <div class="flex flex-grow flex-col gap-4">
    <div>
      <Text style={TextStyle.SECTION_HEADING} content="Focus Items" />
    </div>
    <div>
      <FocusItemList isInEditMode={true} />
    </div>
  </div>
</div> -->
<div class="relative flex flex-col items-center gap-12 h-full w-full">
  <div class="flex flex-col gap-8 w-full">
    <IntervalBar />
    <TimeComposition isExpandedMode={true} />
  </div>
  <button
    class="flex flex-col items-center gap-1"
    on:click={() => appStore.runAction(PointronEventEnum.SHOW_FOCUSITEMS_MODAL)}
  >
    <!-- TODO - count should ignore parent goal if tasks added -->
    <span class="underline-dotted">
      {$focusItemsStore.items.length > 0
        ? $focusItemsStore.items.length + " focus Items added"
        : "+ add focus items"}
    </span>
    {#if $focusItemsStore.items.length > 0}
      <span class="text-b4 text-fgs3"> tap to edit </span>
    {/if}
  </button>

  <!-- <Button
    label={$focusItemsStore.items.length + " focus Items"}
    size={Size.sm}
    on:click={() => appStore.runAction(PointronEventEnum.SHOW_FOCUSITEMS_MODAL)}
  /> -->
</div>
