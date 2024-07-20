<script lang="ts">
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  export let icon: string;
  export let on: boolean = false;
  function onclick() {
    on = !on;
  }
</script>

<button
  on:click={onclick}
  class={cn(
    "flex items-center justify-center h-10 px-3 py-2 rounded-md hover:bg-bgs3",
    bg(on ? 2 : 1)
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
