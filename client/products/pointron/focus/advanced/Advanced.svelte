<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import FocusItemList from "../elements/focusitem/FocusItemList.svelte";
  import IntervalBar from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBar.svelte";
  import view from "$lib/client/stores/view.store";
  import AdvancedPortrait from "./AdvancedPortrait.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import TimeComposition from "./composition/TimeComposition.svelte";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import FormLabelTooltip from "$lib/client/elements/text/formLabel/FormLabelTooltip.svelte";
  import { Size } from "$lib/client/types/size.enum";
  $: isExpandedMode =
    ($view.landscapiness > 1.4 && $view.scale > 1) || $view.scale > 1.3;
</script>

<div class="relative flex flex-col w-full h-full p-4 bg--bgs2/40">
  <div class="flex justify-between w-full">
    <Text style={TextStyle.PANEL_HEADING} content="Advanced focus" />
    <FormLabelTooltip
      icon="ph:question-light"
      info={{
        body: "Use advanced focus to start a focus session with more granular control. \n 1. Start by adding goals/tasks that you want to focus. \n 2. Then, set the duration using presets or custom duration. \n 3. Finally, click on **Start session** to begin.",
        size: Size.lg
      }}
    />
  </div>
  {#if !isExpandedMode}
    <AdvancedPortrait parentBgIndex={1} />
  {:else}
    <div class="flex flex-col w-full flex-grow pb-10">
      <div class="flex pt-4 pb-2">
        <IntervalBar context={SessionUIContext.THIN_ON_DESKTOP} />
      </div>
      <div class="flex gap-4 py-4 flex-grow">
        <div class="flex flex-col gap-8 w-1/2 h-full">
          <TimeComposition parentBgIndex={1} />
        </div>
        <div class="flex flex-col justify-center h-full">
          <div class="h-full pb-4">
            <Divider
              orientation={Orientation.Vertical}
              colorStrength={ColorStrength.Normal}
            />
          </div>
        </div>
        <div class="relative flex flex-col h-full w-1/2">
          <div>
            <Text style={TextStyle.SECTION_HEADING} content="Focus Items" />
          </div>
          <FocusItemList isInEditMode={true} />
        </div>
      </div>
    </div>
  {/if}
</div>
