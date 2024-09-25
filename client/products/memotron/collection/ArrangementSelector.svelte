<script lang="ts">
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import Slider from "$lib/client/elements/slider/Slider.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";

  const dispatch = createEventDispatcher();

  export let arrangement: Arrangement;
  export let density = 1;

  let isPopoverVisible = false;

  const allArrangements = [
    {
      value: Arrangement.LIST,
      label: "List",
      icon: "ph:list-thin"
    },
    {
      value: Arrangement.GRID,
      label: "Grid",
      icon: "ph:squares-four-thin"
    },
    {
      value: Arrangement.MASONRY,
      label: "Masonry",
      icon: "ph:gradient-thin"
    }
  ];

  function resolveIcon(arrangement: Arrangement) {
    return allArrangements.find((a) => a.value === arrangement)?.icon ?? "";
  }
  function onDensityChange(event: Event) {
    dispatch("densityChange", density);
  }
</script>

<Popover bind:isPopoverVisible>
  <div class="flex gap-3">
    <Toggle icon={resolveIcon(arrangement)} on={isPopoverVisible} />
  </div>
  <div slot="popover" class="flex flex-col gap-2 p-2 py-4 w-56">
    <div class="px-2">
      <Text content="Arrangement" style={TextStyle.SECTION_HEADING_SMALL} />
    </div>
    <VerticalSwitcher
      labelOrientation={Orientation.Horizontal}
      style={VerticalSwitcherStyle.BG}
      items={allArrangements}
      bind:selected={arrangement}
      on:switch
    />
    {#if arrangement === Arrangement.MASONRY}
      <div class="flex flex-col gap-1 mt-4 px-2">
        <span class="text-fgs3 text-b3">Density</span>
        <Slider
          bind:value={density}
          min={1}
          max={3}
          step={0.5}
          on:input={onDensityChange}
        />
      </div>
    {/if}
  </div>
</Popover>
