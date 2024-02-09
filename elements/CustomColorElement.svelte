<script lang="ts">
  import { onMount } from "svelte";
  import { appConstants, userPreferences } from "$lib/tidy/stores/app.store";
  import { resolveSaturationAndLightness } from "$lib/tidy/utils/theme.utils";
  export let classList: string;
  export let hue: number | undefined;
  export let isOutline: boolean = false;
  let saturation = 50;
  let lightness = 50;
  onMount(() => {
    let values = resolveSaturationAndLightness(
      $userPreferences,
      appConstants.colorSchemeSLConfig
    );
    if (values) {
      saturation = values.saturation;
      lightness = values.lightness;
    }
  });
</script>

<button
  class={classList + (isOutline ? "" : " text-bgs1")}
  on:click
  on:mouseenter
  on:mouseleave
  style={isOutline
    ? `outline: 1px solid; outline-color: hsl(${hue}, ${saturation}%, ${lightness}%); color: hsl(${hue}, ${saturation}%, ${lightness}%);`
    : `background-color:hsl(${hue}, ${saturation}%, ${lightness}%)`}
>
  <slot />
</button>
