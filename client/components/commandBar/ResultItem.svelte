<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  // import {
  //   easeBackIn,
  //   easeBackOut,
  //   easeBounceIn,
  //   easeExpIn,
  //   easeQuadIn
  // } from "d3";
  import { quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  export let index: number = 0;
  export let isActive: boolean = false;
  export let isSearchAction: boolean = false;
  let ref: HTMLElement;
  $: if (isActive && ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "end" });
  }
</script>

<button
  bind:this={ref}
  on:click
  class={cn("w-full flex items-center px-3 py-2 truncate border-l-[3px]", {
    "bg-bgs2 border-fgs1": isActive,
    "hover:bg-bgs2-striped border-transparent text-fgs2": !isActive,
    "h-12": !isSearchAction
  })}
  in:fly={{
    duration: 500,
    delay: index * 1.2 * 50,
    easing: quintOut,
    x: 0,
    y: index * 0.2 * 50,
    opacity: 0
  }}
>
  <slot />
</button>
