<script lang="ts">
  import { fileLoaderv2 } from "@21n/actions/lazyload.action";
  import Icon from "@21n/elements/Icon.svelte";
  import { Arrangement } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { isValidUrl } from "@21n/shared-utils/utils";
  import { resolveFallbackIconForUrl } from "@21n/products/memotron/node/node.utils";

  export let src: string;
  export let arrangement: Arrangement | undefined = undefined;
  export let isApplyBgColor = false;

  let classList = "";
  export { classList as class };

  function handleImageError(event: Event) {
    const target = event.currentTarget as HTMLImageElement;
    target.style.display = "none";
    target.nextElementSibling?.classList.remove("hidden");
  }
</script>

<img
  alt="..."
  class={classList}
  use:fileLoaderv2={{ source: src, isApplyBgColorFromImage: isApplyBgColor }}
  on:load
  on:error={handleImageError}
/>
<div
  class={cn("hidden w-full h-full bg-bgs3 flex items-center justify-center", {
    "absolute inset-0 rounded-t-md": arrangement === Arrangement.GRID,
    "py-2": arrangement === Arrangement.MASONRY
  })}
>
  <Icon
    icon={src && isValidUrl(src) ? resolveFallbackIconForUrl(src) : "globe"}
  />
</div>
