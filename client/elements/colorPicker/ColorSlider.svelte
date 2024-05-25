<script lang="ts">
  import { appConstants } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import {
    resolveIfActiveFgFg,
    resolveSaturationAndLightness,
    retrieveCurrentColors
  } from "$lib/client/utils/theme.utils";
  import { createEventDispatcher } from "svelte";
  export let hue: number | undefined = 0;
  export let saturation: number = 50;
  export let lightness: number = 50;
  const currentColors = retrieveCurrentColors($appearance);
  export let fgColorHsl: string = refreshFgColorHsl(hue);
  $: fgColorHsl = refreshFgColorHsl(hue);
  const dispatch = createEventDispatcher();
  const handleHueChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    hue = parseInt(target.value);
    dispatch("change", hue);
  };
  let values = resolveSaturationAndLightness(
    $appearance,
    appConstants.colorSchemeSLConfig
  );
  if (values) {
    saturation = values.saturation;
    lightness = values.lightness;
  }
  function refreshFgColorHsl(hue: number = 0) {
    const val = resolveIfActiveFgFg(hue ?? undefined, $appearance)
      ? currentColors["fgs1"]
      : currentColors["bgs1"];
    return val!;
  }
</script>

<div
  class="color-range border border-fgs3 rounded-full w-full h-6"
  style="--sat: {saturation}%; --lig: {lightness}%; --thumb-border: {fgColorHsl}"
>
  <input
    type="range"
    min="0"
    max="360"
    value={hue}
    on:input={handleHueChange}
    class="w-full h-3 bg-transparent appearance-none focus:outline-none"
    style="--hue: {hue};"
  />
</div>

<style>
  .color-range {
    background: linear-gradient(
      to right,
      hsl(0, var(--sat), var(--lig)),
      hsl(60, var(--sat), var(--lig)),
      hsl(120, var(--sat), var(--lig)),
      hsl(180, var(--sat), var(--lig)),
      hsl(240, var(--sat), var(--lig)),
      hsl(300, var(--sat), var(--lig)),
      hsl(360, var(--sat), var(--lig))
    );
  }

  .color-range input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 36px;
    width: 36px;
    border-radius: 50%;
    background: hsl(var(--hue), var(--sat), var(--lig));
    cursor: pointer;
    margin-top: 6px;
    box-shadow: 0px 0px 2px 0px hsl(var(--hue), var(--sat), 60%);
    border: solid 1px var(--thumb-border);
  }
</style>
