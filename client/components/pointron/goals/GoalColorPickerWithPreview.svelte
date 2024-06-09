<script lang="ts">
  import ColorSlider from "$lib/client/elements/colorPicker/ColorSlider.svelte";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import { ColorType } from "$lib/client/types/appearance.type";
  import { isValidString, truncateString } from "$lib/client/utils/text.utils";
  import { customColorStyle } from "$lib/client/utils/theme.utils";
  export let hue: number | undefined = 0;
  export let label: string = "";
</script>

<div class="flex flex-col gap-2 items-start w-full">
  <FormControlLabel props={{ label: "Color" }} forId="color-picker" />
  <div class="flex flex-wrap gap-4 w-full items-center justify-between">
    <!-- <PopColorPickerButton on:value-change bind:hue {usedColors} /> -->
    <!-- TODO - color picker improvements - used colors, color from custom hex -->
    <div class="w-full xl:w-1/2">
      <ColorSlider bind:hue on:change />
    </div>
    {#if label}
      <div
        class="flex flex-col items-start border border-bgs3 px-4 py-2 rounded-sm"
      >
        <span class="text-fgs2 text-b4">Preview</span>
        <div class="flex text-b2 gap-4 items-center justify-between">
          <span style={customColorStyle($appearance, ColorType.Fg, "fgs1", hue)}
            >{isValidString(label)
              ? truncateString(label, 8)
              : $appStore.product}</span
          >
          <ActiveBackgroundElement
            color={hue ?? undefined}
            isBackgroundActive={true}
            class="text-bgs1 px-2 py-1 rounded-sm"
          >
            {isValidString(label)
              ? truncateString(label, 8)
              : $appStore.product}
          </ActiveBackgroundElement>
        </div>
      </div>
    {/if}
  </div>
</div>
