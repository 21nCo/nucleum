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
  import SimpleDigitalClock from "../../clocks/SimpleDigitalClock.svelte";
  import { IntervalBarContext } from "$lib/client/types/pointron/session.type";
  $: isExpandedMode =
    ($view.landscapiness > 1.4 && $view.scale > 1) || $view.scale > 1.3;
  $: isExtraLargeScreen = $view.landscapiness > 1.5 && $view.scale > 1.5;
</script>

<div class="relative flex flex-col w-full h-full p-4">
  <div class="flex justify-between w-full">
    <Text style={TextStyle.PANEL_HEADING} content="Advanced" />
    <!-- <TopBarActions {isExpandedMode} /> -->
  </div>
  {#if !isExpandedMode}
    <AdvancedPortrait />
  {:else}
    <div class="flex w-full flex-grow pb-10">
      <div class="flex flex-col gap-8 py-4 w-1/2 max-w-xl h-full">
        <IntervalBar context={IntervalBarContext.THIN_ON_DESKTOP} />
        <TimeComposition {isExpandedMode} />
      </div>
      <div class="flex flex-col justify-center h-full px-4">
        <div class="h-full">
          <Divider
            orientation={Orientation.Vertical}
            colorStrength={ColorStrength.Subtle}
          />
        </div>
      </div>
      <div class="relative flex flex-col h-full py-4 w-1/2">
        <div>
          <Text style={TextStyle.SECTION_HEADING} content="Focus Items" />
        </div>
        <FocusItemList isInEditMode={true} />
      </div>
      {#if isExtraLargeScreen}
        <div class="w-1/2 h-full p-4 flex items-center justify-center">
          <SimpleDigitalClock />
        </div>
      {/if}
    </div>
  {/if}
</div>
