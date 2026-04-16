<script lang="ts">
  import InlineSearchBar from "@21n/elements/InlineSearchBar.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
  import { fly } from "svelte/transition";
  import { recentsStore } from "@21n/components/record/recent.store";
  import Records from "@21n/components/record/Records.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Size } from "@21n/types/size.enum";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { onMount, onDestroy } from "svelte";
  import { SearchStore } from "@21n/components/record/record.store";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Button from "@21n/elements/button/Button.svelte";

  let {
    isActive = false,
    isSearchFocused = $bindable(false)
  }: {
    isActive?: boolean;
    isSearchFocused?: boolean;
  } = $props();
  let searchStore = new SearchStore();
  let librarySearchQuery = $state("");
  let searchData = $state<any[]>([]);
  let searchRef: InlineSearchBar;
  let height = $state("100%");

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

  async function handleSearch() {
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
        onclick={() => {
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
        onSearch={handleSearch}
        onFocus={() => {
          isSearchFocused = true;
        }}
        style={InputStyle.FILLED}
      ></InlineSearchBar>
      {#if isSearchFocused}
        <Button
          icon="cross"
          onclick={() => {
            isSearchFocused = false;
          }}
        />
      {/if}
    </div>
  </div>
{/if}
