<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TypewritingText from "$lib/client/elements/text/animatingText/TypewritingText.svelte";
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Size } from "$lib/client/types/size.enum";
  import FocusPlayerTimeText from "./player/FocusPlayerTimeText.svelte";
  import SessionNotes from "./notes/SessionNotes.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
</script>

<div
  class="w-full h-full bg-bgs1 flex flex-col justify-between items-center p-8"
>
  <div
    class="w-full text-h5 flex-grow flex justify-center {$view.isPortrait &&
      'flex-col'}"
  >
    <div class={$view.isPortrait ? "h-2/5" : "w-1/2"}>
      <TypewritingText text="Thinking..." />
    </div>
    <div
      class="bg-bgs2 mo:p-4 p-6 2k:p-10 rounded-md flex flex-col items-start overflow-y-auto {$view.isPortrait
        ? 'h-2/5'
        : 'w-1/2'}"
    >
      <SessionNotes />
    </div>
  </div>
  <div class="flex w-full text-b2 text-fgs3 justify-between items-center">
    <FocusPlayerTimeText />
    <div>
      <Button
        label="close"
        size={Size.sm}
        on:click={() => {
          modalEvent.hide(PointronAction.THINK_MODE);
        }}
      />
    </div>
  </div>
</div>
