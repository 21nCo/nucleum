<script lang="ts">
  import {
    easeBackIn,
    easeBackOut,
    easeBounceIn,
    easeExpIn,
    easeQuadIn
  } from "d3";
  import { quintIn, quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  export let index: number = 0;
  export let isActive: boolean = false;
  let ref: HTMLElement;
  $: if (isActive && ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "end" });
  }
</script>

<button
  bind:this={ref}
  on:click
  class="w-full flex justify-between items-center px-4 py-2 h-14 {isActive &&
    'bg-bgs3'}"
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
