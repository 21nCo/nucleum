<script lang="ts">
  import { appearance } from "@21n/stores/appearance.store";
  import ThemeLayer from "@21n/layout/layers/themeLayer/ThemeLayer.svelte";
  import { cn } from "@21n/utils/ui.utils";

  export let id: string;
  let classList: string = "";
  export { classList as class };
  export let isInlineExtensionContext: boolean = false;
</script>

<div
  {id}
  class={cn(
    "text-base text-fgs1 relative",
    classList,
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
  on:keydown|stopPropagation
  on:keyup|stopPropagation
>
  <ThemeLayer extensionContext={id} {isInlineExtensionContext}>
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
