<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import ColorSlider from "@21n/elements/colorPicker/ColorSlider.svelte";
  import { appStore } from "@21n/stores/app.store";
  import appearance from "@21n/stores/appearance.store";
  import FormControlLabelWrapper from "@21n/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import type { InputLabel } from "@21n/types/input.type";
  import ColorPickerElement from "@21n/elements/colorPicker/ColorPickerElement.svelte";
  import { createEventDispatcher } from "svelte";
  import { debouncer } from "@21n/utils/utils";
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
  export let onDebouncedChangeCallback: (
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

  function onDebouncedChange(e: CustomEvent<number | string>) {
    dispatch("debouncedChange", e.detail);
    onDebouncedChangeCallback(e.detail, {
      saturation,
      lightness
    });
  }

  const debouncedChangePropagation = debouncer(onDebouncedChange, 1000);
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
        on:debouncedChange={debouncedChangePropagation}
      />
    {:else}
      <ColorPickerElement
        on:change={onChange}
        on:debouncedChange={debouncedChangePropagation}
        bind:value={hex}
      />
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
