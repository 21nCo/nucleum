<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LinkItem from "./LinkItem.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  const dispatch = createEventDispatcher();
  export let links: string[];
  export let isWrapItems: boolean = false;
</script>

{#if links?.length > 0}
  <div
    class={cn("flex gap-2 w-full", {
      "flex-wrap": isWrapItems,
      "overflow-x-auto": !isWrapItems
    })}
  >
    {#each links as item}
      <LinkItem
        id={item}
        on:click={() => {
          dispatch("click", item);
        }}
        on:remove={() => {
          dispatch("unlink", item);
        }}
      />
    {/each}
  </div>
{/if}
