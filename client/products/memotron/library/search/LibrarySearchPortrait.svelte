<script lang="ts">
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { fly } from "svelte/transition";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import Records from "$lib/client/components/record/Records.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { onMount, onDestroy } from "svelte";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Button from "$lib/client/elements/button/Button.svelte";

  export let isActive: boolean = false;
  export let isSearchFocused: boolean = false;
  let searchStore = new SearchStore();
  let librarySearchQuery: string = "";
  let searchData: any[] = [];
  let searchRef: InlineSearchBar;
  let height = "100%";

  function handleResize() {
    // Get the actual visible height
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    height = `${visibleHeight}px`;
  }

  onMount(() => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }
    handleResize();
  });

  onDestroy(() => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", handleResize);
      window.visualViewport.removeEventListener("scroll", handleResize);
    }
  });

  async function handleSearch(e: CustomEvent) {
    searchData = await searchStore.select({
      resource: Resource.everything,
      searchQuery: librarySearchQuery,
      limit: 150
    });
  }
</script>

{#if isActive}
  <div
    class={cn("flex pb-3", {
      "fixed bottom-0 w-full h-[100dvh] z-100 bg-bgs1 flex-col justify-between pt-4 px-2":
        isSearchFocused
    })}
    in:fly={{ y: 10, duration: 300 }}
    style="height: {isSearchFocused ? height : ''}"
  >
    {#if isSearchFocused}
      <button
        class="flex min-h-0 flex-1 w-full overflow-y-auto"
        on:click={() => {
          searchRef.blur();
        }}
      >
        {#if librarySearchQuery}
          <Records
            data={searchData}
            accessPoint={ResourceAccessPoint.LIBRARY}
            size={Size.sm}
          />
        {:else if $recentsStore.recents && $recentsStore.recents.length > 0}
          {@const recentsData = recentsStore.resolve()}
          <Records
            data={recentsData}
            accessPoint={ResourceAccessPoint.LIBRARY}
            size={Size.sm}
          />
          <!-- <ScrollViewBottomSpacer /> -->
        {:else}
          <EmptyStatusView
            size={Size.sm}
            isSearchContext={true}
            mainText="No recents found"
          />
        {/if}
      </button>
    {/if}
    <div class="flex items-center gap-1 w-full">
      <InlineSearchBar
        bind:this={searchRef}
        bind:query={librarySearchQuery}
        padding="px-4"
        placeholder="Search library"
        on:search={handleSearch}
        on:focus={() => {
          isSearchFocused = true;
        }}
        style={InputStyle.FILLED}
      ></InlineSearchBar>
      {#if isSearchFocused}
        <Button
          icon="cross"
          on:click={() => {
            isSearchFocused = false;
          }}
        />
      {/if}
    </div>
  </div>
{/if}
