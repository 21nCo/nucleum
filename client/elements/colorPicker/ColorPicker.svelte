<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import ColorSlider from "./ColorSlider.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import type { InputLabel } from "$lib/client/types/input.type";
  import ColorPickerElement from "./ColorPickerElement.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let hue = 0;
  export let label: InputLabel | undefined = undefined;
  export let isShowPreview: boolean = true;
  export let isHueMode: boolean = true;
  export let hex: string = "#000000";
  export let onChangeCallback: (
    value: number | string,
    additional?: {
      saturation?: number;
      lightness?: number;
    }
  ) => void = () => {};
  let saturation = 50;
  let lightness = 50;
  let fgColorHsl = "";
  let isDark: boolean = false;
  $: isDark = $appearance.colorScheme.isDark;

  function onChange(e: CustomEvent<number | string>) {
    dispatch("change", e.detail);
    onChangeCallback(e.detail, {
      saturation,
      lightness
    });
  }
</script>

<FormControlLabelWrapper props={label}>
  <div class="flex flex-col gap-6 items-center justify-center w-full">
    {#if isHueMode}
      <ColorSlider
        bind:hue
        bind:saturation
        bind:fgColorHsl
        bind:lightness
        on:change={onChange}
      />
    {:else}
      <ColorPickerElement on:change={onChange} bind:value={hex} />
    {/if}
    {#if $appStore.isDebugMode}
      <Button
        label={isDark ? "Dark" : "Light"}
        on:click={() => {
          isDark = !isDark;
        }}
      />
    {/if}
  </div>
  {#if isShowPreview}
    {#if isHueMode}
      <div class="flex w-full justify-center mt-4">
        <div
          class="w-1/2 h-8 p-2 flex justify-center items-center rounded-md"
          style="background-color:hsl({hue}, {saturation}%, {lightness}%); color: {fgColorHsl};"
        >
          Preview
        </div>
      </div>
    {:else}
      <div class="flex w-full justify-center mt-4">
        <div
          class="w-1/2 h-8 p-2 flex justify-center items-center rounded-md"
          style="background-color: {hex};"
        >
          Preview
        </div>
      </div>
    {/if}
  {/if}
</FormControlLabelWrapper>

<!-- TODO - used colors -->
