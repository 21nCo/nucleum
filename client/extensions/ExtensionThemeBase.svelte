<script lang="ts">
  import { appearance } from "$lib/client/stores/appearance.store";
  import ThemeLayer from "$lib/client/layout/layers/themeLayer/ThemeLayer.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
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
    <div id="tooltips"></div>
  </ThemeLayer>
</div>
