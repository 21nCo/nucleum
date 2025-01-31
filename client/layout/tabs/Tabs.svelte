<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { onMount } from "svelte";
  import TopBarResourceItem from "./TopBarResourceItem.svelte";
  import { tabs } from "./tabs.store";
  import { moveItemInArray } from "$lib/shared/utils/obj.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ButtonStyle } from "$lib/client/types/button.type";
  const dispatch = createEventDispatcher();

  export let isShowHome = false;
  export let activeTab: string | null = null;
  let pinnedItems: IRecordId[] = tabs.get();
  let isInFocusMode = false;

  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      pinnedItems = tabs.get();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }
</script>

{#if (pinnedItems?.length > 0 || isShowHome) && !isInFocusMode}
  <div
    class="flex gap-3 justify-between items-center w-full h--12 bg-bgs2 py--2 pr-4 userdata"
  >
    <span class="flex gap--2 grow">
      {#if isShowHome}
        <div
          class={cn(
            "flex justify-center items-center px-2 border-r border-bgs3",
            {
              "bg-bgs1": !activeTab
            }
          )}
        >
          <Button
            icon="ph:house"
            style={ButtonStyle.PLAIN}
            on:click={(e) => {
              dispatch("home", true);
            }}
          />
        </div>
      {/if}
      {#each pinnedItems as item, index (item)}
        <TopBarResourceItem
          {item}
          on:click={(e) => {
            dispatch("home", false);
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
<svelte:window on:focusMode={handleFocusMode} />
