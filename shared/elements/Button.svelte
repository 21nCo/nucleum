<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { onMount } from "svelte";

  export let label: string;
  export let type: string = "secondary";
  export let isCustomAttributes = false;
  export let size: Size = Size.md;
  let classList = "flex flex-row px-6 rounded-md gap-4 max-w-fit";
  $: {
    if (type == "secondary") {
      classList += " bg-bgs2 hover:bg-bgs3";
    } else {
      classList += " bg-accent1 text-bgs1 hover:opacity-80";
    }
  }
  onMount(() => {
    if (size == Size.xl) classList += " text-h2 py-5";
    else if (size == Size.lg) classList += " text-lg py-4";
    else if (size == Size.md) classList += " text-md py-3";
    else if (size == Size.sm) classList += " text-b2 py-2";
    else if (size == Size.xs) classList += " text-xs py-1";
  });
</script>

{#if isCustomAttributes}
  <div class={classList}>
    <slot />
  </div>
{:else}
  <button class={classList} on:click>{label}</button>
{/if}
