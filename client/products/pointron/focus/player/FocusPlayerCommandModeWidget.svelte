<script>
  import { fullScreen } from "$lib/client/components/modal/modal.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import IntervalBar from "../elements/intervalbar/IntervalBar.svelte";
  import FocusPlayerTimeText from "./FocusPlayerTimeText.svelte";
</script>

<button
  class="flex flex-col gap-2 items-start justify-center w-80 rounded-md p-2 hover:bg-bgs2"
  on:click={() => {
    fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);
  }}
>
  <FocusPlayerTimeText />
  <!-- <IntervalBar context={SessionUIContext.PIP} /> -->
</button>
