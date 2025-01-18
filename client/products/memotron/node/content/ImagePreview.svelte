<script lang="ts">
  import { fileLoaderv2 } from "$lib/client/actions/lazyload.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let src: string;
  export let arrangement: Arrangement | undefined = undefined;
  export let isApplyBgColor = false;

  let classList = "";
  export { classList as class };
</script>

<img
  alt="..."
  class={classList}
  use:fileLoaderv2={{ source: src, isApplyBgColorFromImage: isApplyBgColor }}
  on:load
  on:error={(e) => {
    const target = e.currentTarget;
    target.style.display = "none";
    target.nextElementSibling?.classList.remove("hidden");
  }}
/>
<div
  class={cn("hidden w-full h-full bg-bgs3 flex items-center justify-center", {
    "absolute inset-0 rounded-t-md": arrangement === Arrangement.GRID,
    "py-2": arrangement === Arrangement.MASONRY
  })}
>
  <Icon icon="ph:globe-light" />
</div>
