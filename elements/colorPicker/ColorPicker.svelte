<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import ColorSlider from "./ColorSlider.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  export let hue = 0;
  export let isShowPreview: boolean = true;
  let saturation = 50;
  let lightness = 50;
  let fgColorHsl = "";
  let isDark: boolean = false;
  $: isDark = $appearance.colorScheme.isDark;
</script>

<div class="flex flex-col gap-2">
  <FormControlLabel label="Choose color" />
  <div class="flex flex-col gap-6 items-center justify-center">
    {#if isShowPreview}
      <div
        class="w-1/2 h-6 p-2 flex items-center justify-center rounded-md"
        style="background-color:hsl({hue}, {saturation}%, {lightness}%); color: {fgColorHsl};"
      >
        Preview
      </div>
    {/if}
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
</div>
<!-- TODO - used colors -->
