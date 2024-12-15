<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { onMount } from "svelte";
  import TopBarResourceItem from "./TopBarResourceItem.svelte";
  import { tabs } from "./tabs.store";
  import { moveItemInArray } from "$lib/shared/utils/obj.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  let pinnedItems: IRecordId[] = tabs.get();
  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      pinnedItems = tabs.get();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
</script>

{#if pinnedItems?.length > 0}
  <div
    class="flex gap-3 justify-between items-center w-full h--12 bg-bgs2 py--2 pr-4 userdata"
  >
    <span class="flex gap--2 grow">
      {#each pinnedItems as item, index (item)}
        <TopBarResourceItem
          {item}
          on:click={(e) => {
            tabs.activate(item);
          }}
          on:rearrange={(e) => {
            pinnedItems = moveItemInArray(
              pinnedItems,
              index,
              e.detail > 0 ? 1 : -1
            );
          }}
          on:rearranged={(e) => {
            tabs.rearrange(pinnedItems);
          }}
        />
      {/each}
    </span>
  </div>
{/if}
