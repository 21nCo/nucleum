<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Slider from "$lib/client/elements/slider/Slider.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let arrangement: Arrangement;
  export let density = 1;

  const allArrangements = [
    {
      value: Arrangement.LIST,
      label: "List",
      icon: "ph:list-light"
    },
    {
      value: Arrangement.GRID,
      label: "Grid",
      icon: "ph:squares-four-light"
    },
    {
      value: Arrangement.MASONRY,
      label: "Masonry",
      icon: "ph:gradient-light"
    }
  ];

  function resolveIcon(arrangement: Arrangement) {
    return allArrangements.find((a) => a.value === arrangement)?.icon;
  }
  function onDensityChange(event: Event) {
    dispatch("densityChange", density);
  }
</script>

<Popover>
  <div class="flex gap-3 w-20">
    <Icon icon={resolveIcon(arrangement)} size={Size.sm} />
    <span class="text-fgs2 text-b2">
      {enumToString(arrangement)}
    </span>
  </div>
  <div slot="popover" class="flex flex-col gap-6 p-4 w-56">
    <VerticalSwitcher
      labelOrientation={Orientation.Horizontal}
      style={VerticalSwitcherStyle.BG}
      items={allArrangements}
      bind:selected={arrangement}
      on:switch
    />
    {#if arrangement === Arrangement.MASONRY}
      <div class="flex flex-col gap-1">
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
