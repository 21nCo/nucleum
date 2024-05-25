<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import ColorSlider from "./ColorSlider.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import type { InputLabel } from "$lib/client/types/input.type";
  export let hue = 0;
  export let label: InputLabel | undefined = undefined;
  export let isShowPreview: boolean = true;
  let saturation = 50;
  let lightness = 50;
  let fgColorHsl = "";
  let isDark: boolean = false;
  $: isDark = $appearance.colorScheme.isDark;
</script>

<FormControlLabelWrapper props={label}>
  <div class="flex flex-col gap-6 items-center justify-center w-full">
    <ColorSlider
      bind:hue
      bind:saturation
      bind:fgColorHsl
      bind:lightness
      on:change
    />
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
    <div class="flex w-full justify-center mt-4">
      <div
        class="w-1/2 h-8 p-2 flex justify-center items-center rounded-md"
        style="background-color:hsl({hue}, {saturation}%, {lightness}%); color: {fgColorHsl};"
      >
        Preview
      </div>
    </div>
  {/if}
</FormControlLabelWrapper>

<!-- TODO - used colors -->
