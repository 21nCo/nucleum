<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TypewritingText from "$lib/client/elements/text/animatingText/TypewritingText.svelte";
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Size } from "$lib/client/types/size.enum";
  import FocusPlayerTimeText from "./player/FocusPlayerTimeText.svelte";
  import SessionNotes from "./notes/SessionNotes.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
</script>

<div
  class="w-full h-full bg-bgs1 flex flex-col justify-between items-center mo:p-4 p-8"
>
  <div
    class="w-full text-h5 flex-grow flex justify-center portrait:flex-col-reverse"
  >
    <div class="portrait:h-2/5 w-full landscape:w-1/3 flex flex-col">
      <div class="w-full grow flex justify-center items-center">
        <TypewritingText text="Thinking..." />
      </div>
      <div class="flex gap-3 text-b2 text-fgs3 justify-between items-center">
        <div>
          <FocusPlayerTimeText />
        </div>
        <div class="mr-3">
          <Button
            label="Go back"
            icon="arrow-u-up-left"
            style={ButtonStyle.PLAIN}
            size={Size.sm}
            on:click={() => {
              modalEvent.hide(PointronAction.THINK_MODE);
            }}
          />
        </div>
      </div>
    </div>
    <div
      class="bg-bgs2 mo:p-4 p-6 2k:p-10 rounded-md flex flex-col items-start overflow-y-auto portrait:h-3/5 landscape:w-2/3"
    >
      <SessionNotes />
    </div>
  </div>
</div>
