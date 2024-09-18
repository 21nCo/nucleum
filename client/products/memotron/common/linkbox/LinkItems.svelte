<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LinkItem from "./LinkItem.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  const dispatch = createEventDispatcher();
  export let links: IRecordId[];
  export let isWrapItems: boolean = false;
  export let parentBgIndex: number = 1;
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
        {parentBgIndex}
        on:click={(e) => {
          dispatch("click", {
            item,
            event: e.detail
          });
        }}
        on:remove={() => {
          dispatch("unlink", item);
        }}
      />
    {/each}
  </div>
{/if}
