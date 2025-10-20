<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let unit: string;
  export let isActive: boolean = false;
  function onclick(event: MouseEvent) {
    dispatch("click", unit);
    event.stopPropagation();
  }
</script>

<button
  on:click={onclick}
  class={cn(
    "text-b2 leading-8 py-1 px-2 w-full cursor-pointer notouch:hover:bg-bgs2 active:bg-bgs2 text-left",
    {
      "bg-bgs2": isActive
    }
  )}>{unit}</button
>
