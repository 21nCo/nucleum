<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState.store";
  import { onMount } from "svelte";
  import TopBarResourceItem from "./TopBarResourceItem.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  let pinnedItems = uiState.getTopBarState();
  $: console.log({ pinnedItems });
  onMount(() => {
    uiState.subscribe((x) => {
      pinnedItems = uiState.getTopBarState();
    });
  });
</script>

{#if pinnedItems?.length > 0}
  <div class="flex gap-3 justify-between w-full h-12 bg-bgs2 py-2 px-6">
    <span class="flex gap-3 grow">
      <Icon
        icon="home"
        size={Size.lg}
        on:click={() => {
          appStore.toggleSearchParam(ResourceAccessMode.TOPBARFOCUS, undefined);
        }}
      />
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
      <Icon
        icon="search"
        size={Size.lg}
        on:click={() => {
          appStore.toggleSearchParam(ResourceAccessMode.TOPBARFOCUS, undefined);
        }}
      />
    </span>
  </div>
{/if}
