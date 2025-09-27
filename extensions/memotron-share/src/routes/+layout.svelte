<script lang="ts">
  import "../app.css";
  import ThemeLayer from "$lib/client/layout/layers/themeLayer/ThemeLayer.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { appearance } from "$lib/client/stores/appearance.store";
</script>

<div 
id="base"
class={cn(
  "text-base text-fgs1 bg-bgs1 relative w-screen h-screen flex",
  $appearance.theme,
  $appearance.colorScheme.tailwindSelector
)}
>
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>

