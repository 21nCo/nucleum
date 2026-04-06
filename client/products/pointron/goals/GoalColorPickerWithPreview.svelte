<script lang="ts">
  import ColorSlider from "@21n/elements/colorPicker/ColorSlider.svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { isValidString, truncateString } from "@21n/shared-utils/text.utils";

  let {
    hue = $bindable(0),
    label = ""
  }: {
    hue?: number;
    label?: string;
  } = $props();
</script>

<div class="flex flex-col gap-2 items-start w-full">
  <FormControlLabel props={{ label: "Color" }} forId="color-picker" />
  <div class="flex flex-wrap gap-4 w-full items-center justify-between">
    <div class="w-full xl:w-1/2">
      <ColorSlider bind:hue />
    </div>
    {#if label}
      <div
        class="flex flex-col items-start border border-bgs3 px-4 py-2 rounded-sm"
      >
        <span class="text-fgs2 text-b4">Preview</span>
        <CustomColorPropagator
          color={hue}
          class="flex text-b2 gap-4 items-center justify-between"
        >
          <span class="text-ccs1"
            >{isValidString(label)
              ? truncateString(label, 8)
              : $appStore.product}</span
          >
          <div class="text-bgs1 px-2 py-1 rounded-sm bg-ccs1">
            {isValidString(label)
              ? truncateString(label, 8)
              : ($appStore.product ?? "Preview")}
          </div>
        </CustomColorPropagator>
      </div>
    {/if}
  </div>
</div>
