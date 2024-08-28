<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { onMount } from "svelte";
  import TopBarResourceItem from "./TopBarResourceItem.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { Action } from "$lib/client/types/action.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  let pinnedItems = refreshPinnedItems();
  $: console.log({ pinnedItems });
  onMount(() => {
    uiState.subscribe((x) => {
      pinnedItems = refreshPinnedItems();
    });
  });
  function refreshPinnedItems() {
    return uiState.getState(ResourceAccessPoint.TOP_BAR, {
      isProductScoped: true
    });
  }
</script>

{#if pinnedItems?.length > 0}
  <div
    class="flex gap-3 justify-between items-center w-full h--12 bg-bgs2 py--2 pr-4"
  >
    <span class="flex gap--2 grow">
      {#each pinnedItems as item (item)}
        <TopBarResourceItem
          {item}
          on:click={(e) => {
            appStore.resourceClickHandler(
              e,
              item,
              ResourceAccessMode.TOPBARFOCUS
            );
          }}
        />
      {/each}
    </span>
    <span>
      <Button
        icon="search"
        size={Size.sm}
        parentBgIndex={2}
        on:click={() => {
          appStore.runAction(Action.GLOBAL_SEARCH);
        }}
      />
    </span>
  </div>
{/if}
