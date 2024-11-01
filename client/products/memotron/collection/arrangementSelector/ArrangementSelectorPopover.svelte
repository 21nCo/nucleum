<script lang="ts">
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import Slider from "$lib/client/elements/slider/Slider.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let density: number;
  export let arrangement: Arrangement;
  export let isHideThumbnailPreview: boolean = false;
  export let allArrangements: {
    value: Arrangement;
    label: string;
    icon: string;
  }[];
  export let onDensityChange: (density: number) => void;
  export let onPreviewSettingChange: (event: CustomEvent) => void;
  export let onArrangementChange: (event: CustomEvent) => void;
  function onDensityChanges(event: Event) {
    onDensityChange(density);
  }
</script>

<div class="flex flex-col gap-2 p-2 py-4 w-56 bg-bgs1">
  <div class="px-2 text-left">
    <Text content="Arrangement" style={TextStyle.SECTION_HEADING_SMALL} />
  </div>
  <VerticalSwitcher
    labelOrientation={Orientation.Horizontal}
    style={VerticalSwitcherStyle.BG}
    items={allArrangements}
    bind:selected={arrangement}
    on:switch={onArrangementChange}
  />
  {#if arrangement === Arrangement.MASONRY}
    <div class="flex flex-col gap-1 mt-4 px-2">
      <span class="text-fgs3 text-b3">Density</span>
      <Slider
        bind:value={density}
        min={1}
        max={3}
        step={0.5}
        on:change={onDensityChanges}
      />
    </div>
  {:else}
    <span class="px-2">
      <SwitchInput
        label={{ label: "Hide preview" }}
        size={Size.sm}
        isExpanded={true}
        bind:checked={isHideThumbnailPreview}
        on:change={onPreviewSettingChange}
      />
    </span>
  {/if}
</div>
