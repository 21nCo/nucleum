<script lang="ts">
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import HightlightColorItem from "./HightlightColorItem.svelte";
  import { createEventDispatcher } from "svelte";
  export let selected: string | null = null;
  const dispatch = createEventDispatcher();
</script>

{#if $highlightStore.highlighters.length > 0}
  <span class="flex gap-2 items-center">
    {#each $highlightStore.highlighters as highlighter}
      <HightlightColorItem
        {highlighter}
        isActive={highlighter.id === selected}
        on:click={() => {
          selected = highlighter.id;
          dispatch("color", highlighter);
        }}
      />
    {/each}
  </span>
{/if}
