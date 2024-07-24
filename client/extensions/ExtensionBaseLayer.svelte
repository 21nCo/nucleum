<script>
  import appearance from "$lib/client/stores/appearance.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import ThemeLayer from "../layout/layers/themeLayer/ThemeLayer.svelte";
</script>

<div
  class={cn(
    "text-base text-fgs1 bg-bgs1 relative",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
