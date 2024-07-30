<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  export let icon: string;
  export let on: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  function onclick() {
    on = !on;
  }
</script>

<button
  on:click={onclick}
  class={cn(
    "flex items-center justify-center rounded-md hover:bg-bgs3",
    bg(on ? 2 : 1),
    {
      "h-8 px-2 py-1": size === Size.sm,
      "h-10 px-3 py-2": size === Size.md,
      "h-12 px-4 py-3": size === Size.lg
    }
  )}
>
  <Icon
    {icon}
    class={cn({
      "fill-aps1": on,
      "stroke-fgs1": !on
    })}
  />
</button>
