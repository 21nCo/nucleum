<script lang="ts">
  import { Arrangement, Orientation } from "@21n/types/direction.enum";
  import Slider from "@21n/elements/slider/Slider.svelte";
  import VerticalSwitcher from "@21n/elements/switcher/VerticalSwitcher.svelte";
  import { VerticalSwitcherStyle } from "@21n/types/switcher.enum";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { Size } from "@21n/types/size.enum";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  export let density: number;
  export let arrangement: Arrangement;
  export let isHideThumbnailPreview: boolean = false;
  export let isHideThumbnailTitle: boolean = false;
  export let allArrangements: {
    value: Arrangement;
    label: string;
    icon: string;
  }[];
  export let resource: Resource;
  export let onDensityChange: (density: number) => void;
  export let onPreviewSettingChange: (event: CustomEvent) => void;
  export let onTitleSettingChange: (event: CustomEvent) => void;
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
    <div class="flex flex-col w-full gap-4 mt-4">
      <span class="px-2">
        <SwitchInput
          label={{ label: "Hide title" }}
          size={Size.sm}
          isExpanded={true}
          bind:checked={isHideThumbnailTitle}
          on:change={onTitleSettingChange}
        />
      </span>
      <div class="flex flex-col gap-1 px-2">
        <span class="text-fgs3 text-b3">Sizing</span>
        <OptionSelector
          size={Size.sm}
          options={[
            { label: "s", value: 2.5 },
            { label: "m", value: 2 },
            { label: "l", value: 1.5 },
            { label: "xl", value: 1 }
          ]}
          bind:selected={density}
          on:select={onDensityChanges}
        />
      </div>
    </div>
  {:else if arrangement === Arrangement.GRID && resource === Resource.node}
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
