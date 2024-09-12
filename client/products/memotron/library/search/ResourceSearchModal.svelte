<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import SearchResults from "./SearchResults.svelte";
  import { SearchStore } from "../../memotron.store";
  import { onMount } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  let resource: Resource = Resource.everything;
  let isFiltersVisible: boolean = false;
  let data: any[] = [];
  let recents: any[] = [];
  let searchQuery: string = "";
  let isStarFilterSelected: boolean = false;
  let inputRef: HTMLInputElement;
  let searchStore = new SearchStore();
  const switchItems = [
    {
      label: "All",
      value: Resource.everything,
      icon: "tag"
    },
    {
      label: "Nodes",
      value: Resource.node,
      icon: "node"
    },
    {
      label: "Collections",
      value: Resource.collection,
      icon: "curation"
    }
  ];
  onMount(async () => {
    inputRef?.focus();
    await refresh();
  });
  async function refresh() {
    if (isValidString(searchQuery)) {
      data = await searchStore.select({
        resource,
        searchQuery,
        isStarFilterSelected
      });
    } else {
      data = [];
      recents = await searchStore.recents(resource);
    }
  }
</script>

<div class="flex flex-col gap-4 w-full h-full">
  <header class="flex flex-col w-full">
    <div class="flex justify-between p-4">
      <span>
        <input
          bind:this={inputRef}
          bind:value={searchQuery}
          on:keyup={refresh}
          type="text"
          placeholder="Search resources"
          class="text-h3 w-full bg-transparent focus:outline-none focus:border-none"
        />
      </span>
      <span class="flex gap-2 items-center">
        <Toggle
          icon="adjustments-vertical"
          size={Size.sm}
          bind:on={isFiltersVisible}
        />
      </span>
    </div>
    <PanelSwitcher
      items={switchItems}
      bind:value={resource}
      style={PanelSwitcherStyle.BAR}
      isExpandToFullWidth={true}
      size={Size.sm}
      on:switch={refresh}
    />
  </header>
  <main class="flex overflow-auto">
    {#if data.length > 0 || searchQuery}
      <div class="flex flex-col w-full">
        {#if data.length > 0}
          <SearchResults items={data} />
        {:else}
          <div class="w-full h-full">
            <EmptyStatusView isSearchContext={true} />
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex flex-col w-full items-start">
        <span class="flex px-4">
          <Text style={TextStyle.SECTION_HEADING} content="Recents" />
        </span>
        <SearchResults items={recents} />
      </div>
    {/if}
  </main>
</div>
