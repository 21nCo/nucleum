<script lang="ts">
  import { highlightStore } from "@21n/products/memotron/common/highlighters/highlight.store";
  import HightlightColorItem from "@21n/products/memotron/common/highlighters/HightlightColorItem.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  export let selected: string | null = null;
  export let orientation: Orientation = Orientation.Horizontal;
  const dispatch = createEventDispatcher();
</script>

{#if $highlightStore.highlighters.length > 0}
  <span
    class={cn("flex gap-2 items-center", {
      "flex-col": orientation === Orientation.Vertical
    })}
  >
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
