<script lang="ts">
  import { appearance } from "$lib/client/stores/appearance.store";
  import ThemeLayer from "$lib/client/layout/layers/themeLayer/ThemeLayer.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import fontUrl from "data-url:~/assets/fonts/SenVariable.ttf";

  const fontFace = new FontFace("SenVariable", `url(${fontUrl})`);
  document.fonts.add(fontFace);
  export let id: string;
</script>

<div
  {id}
  class={cn(
    "text-base text-fgs1 relative",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <ThemeLayer extensionContext={id}>
    <slot />
    <div id="popovers"></div>
    <div id="secondary-popovers"></div>
    <div id="tooltips"></div>
  </ThemeLayer>
</div>
<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji+Compat&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
    rel="stylesheet"
  />
</svelte:head>