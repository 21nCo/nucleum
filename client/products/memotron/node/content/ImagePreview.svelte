<script lang="ts">
  import { lazyLoad } from "$lib/client/actions/lazyload.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let src: string;
  export let arrangement: Arrangement | undefined = undefined;
  let classList = "";
  export { classList as class };
</script>

<img
  alt="..."
  class={classList}
  use:lazyLoad={src}
  on:load
  on:error={(e) => {
    e.currentTarget.style.display = "none";
    e.currentTarget.nextElementSibling?.classList.remove("hidden");
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
