<script lang="ts">
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";

    let {
    roll = ["Auth provider", "Cloud provider", "Identity provider"],
    width = 300,
    isCentered = false,
  }: {
    roll?: unknown[];
    width?: number;
    isCentered?: boolean;
  } = $props();

  
  
  let activeTextIndex = 0;
  let parentElement: HTMLElement;
  let childElement: HTMLElement;

  onMount(() => {
    const interval = setInterval(() => {
      activeTextIndex = (activeTextIndex + 1) % roll.length;
    }, 2000);
    return () => clearInterval(interval);
  });
</script>

<div
  bind:this={parentElement}
  class="flex relative overflow-hidden px-2 {isCentered
    ? 'justify-center'
    : ''} text-aps1"
  style="width: {width}px; height: {childElement?.offsetHeight}px;"
>
  {#each roll as text, i}
    {#if i === activeTextIndex}
      <span
        bind:this={childElement}
        class="absolute min-w-max"
        in:fly={{ y: -20, duration: 500 }}
        out:fly={{ y: 20, duration: 200 }}
      >
        {text}
      </span>
    {/if}
  {/each}
</div>
