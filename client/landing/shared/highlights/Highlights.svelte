<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import HighlightItem from "./HighlightItem.svelte";
  import type { IHighlight } from "../landing.type";
  import Title from "../Title.svelte";

  export let title: string = "Details that matter";
  export let subtitle: string =
    "We believe true quality is built one detail at a time";
  export let highlights: IHighlight[] = [];

  function isShorterHighlight(num: number) {
    if (num < 2) return false;
    const offset = (num - 2) % 4;
    return offset === 0 || offset === 1;
  }
</script>

<div class={cn("w-full flex flex-col gap-20 mo:gap-10")}>
  <div class="flex flex-col justify-center items-center">
    <Title {title} {subtitle} />
  </div>
  <div class="grid grid-cols-3 mo:grid-cols-1 gap-6 mo:gap-10 w-full">
    {#each highlights as highlight, i}
      {#if i === highlights.length - 1 && highlights.length % 2 !== 0}
        <!-- Last item and odd number of items - make it full width -->
        <div class="col-span-3 mo:col-span-1">
          <HighlightItem {highlight} isFullWidth={true} />
        </div>
      {:else}
        {@const isShorter = isShorterHighlight(i + 1)}
        <div
          class={cn({
            "col-span-1": isShorter,
            "col-span-2 mo:col-span-1": !isShorter
          })}
        >
          <HighlightItem {highlight} isFullWidth={false} />
        </div>
      {/if}
    {/each}
  </div>
</div>
