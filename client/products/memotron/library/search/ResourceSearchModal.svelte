<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import SearchResults from "./SearchResults.svelte";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import { onMount } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import {
    SearchType,
    type IResourceSelectOrderBy
  } from "$lib/client/types/data.type";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { debouncer } from "$lib/client/utils/utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import SearchResultsPopover from "$lib/client/elements/input/SearchResultsPopover.svelte";
  import LinkSearchResultItem from "../../common/linkbox/LinkSearchResultItem.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";

  let resource: Resource = Resource.everything;
  let isFiltersVisible: boolean = false;
  let data: any[] = [];
  let recents: any[] = [];
  let searchQuery: string = "";
  let inputRef: HTMLInputElement;
  let searchStore = new SearchStore();
  let isRefreshing: boolean = false;
  let searchResultsPopover: SearchResultsPopover;
  let dev_enableSemanticSearch: boolean = false;
  const switchItems = [
    {
      label: "Everything",
      value: Resource.everything,
      icon: "ph:asterisk-light"
    },
    {
      label: "Nodes",
      value: Resource.node,
      icon: "ph:hexagon-light"
    },
    {
      label: "Collections",
      value: Resource.collection,
      icon: "ph:brackets-round-light"
    }
  ];
  onMount(async () => {
    inputRef?.focus();
    searchResultsPopover?.search();
    // await refresh();
  });
  async function refresh(searchQuery?: string) {
    try {
      if (isValidString(searchQuery)) {
        isRefreshing = true;
        let orderBy: IResourceSelectOrderBy | undefined;
        let semanticSearchTopK: number | undefined;
        if (searchStore.searchType == SearchType.SEMANTIC) {
          orderBy = {
            dist: "desc",
            createdAt: "desc"
          };
        }
        data = await searchStore.select({
          resource,
          searchQuery,
          orderBy,
          semanticSearchTopK,
          limit: 150
        });
      } else {
        data = [];
        recents = recentsStore.resolve({ type: resource });
        return recents;
      }
      return data;
    } catch (e) {
      logger.error({ at: "ResourceSearchModal.refresh", error: e });
    } finally {
      isRefreshing = false;
    }
  }
  const debouncedSearch = debouncer(refresh, 500);

  function onSelect(e: CustomEvent) {
    appStore.resourceClickHandler(e.detail.event, e.detail.item.id);
  }
</script>

<div class="flex flex-col gap-4 w-full h-full">
  <header class="flex flex-col w-full">
    <div class="flex p-4">
      <span class="min-w-0 flex-1">
        <input
          bind:this={inputRef}
          bind:value={searchQuery}
          on:keydown={(event) => {
            searchResultsPopover?.keydown(event);
          }}
          on:keyup={(event) => {
            searchResultsPopover?.keyup(event);
          }}
          type="text"
          placeholder={`Search ${resource === Resource.everything ? "anything" : resource + "s"}`}
          class="text-h3 w-full bg-transparent focus:outline-none focus:border-none"
        />
      </span>
      <div class="flex gap-2">
        {#if dev_enableSemanticSearch && $userPreferences.localAI.semanticSearch}
          <SwitchInput
            label={{ label: "Semantic", orientation: Orientation.Horizontal }}
            size={Size.sm}
            on:change={(e) => {
              if (e.detail) {
                searchStore.searchType = SearchType.SEMANTIC;
              } else {
                searchStore.searchType = SearchType.FULL_TEXT;
              }
              refresh();
            }}
            checked={searchStore.searchType === SearchType.SEMANTIC}
          />
        {/if}
        {#if $view.isConstrainedWidth}
          <Button
            icon="ph:x-light"
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              appStore.goBack();
            }}
          />
        {/if}
        {#if isFiltersVisible}
          <Button
            icon="funnel"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            label="Filters"
          />
          <Button
            icon="bars-center-left"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            label="Sort"
          />
          <span class="flex gap-2 items-center">
            <Toggle
              icon="adjustments-vertical"
              size={Size.sm}
              bind:on={isFiltersVisible}
            />
          </span>
        {/if}
      </div>
    </div>
    <PanelSwitcher
      items={switchItems}
      bind:value={resource}
      style={PanelSwitcherStyle.BAR}
      isExpandToFullWidth={true}
      isPreventDropdownForCW={true}
      size={Size.sm}
      on:switch={() => {
        searchResultsPopover?.search();
      }}
    />
  </header>
  <main class="flex overflow-auto flex-1 min-h-0">
    <!-- {#if data.length > 0 || searchQuery}
      <div class="flex flex-col w-full h-full">
        {#if data.length > 0}
          <SearchResults items={data} />
        {:else}
          <div class="w-full h-full">
            <EmptyStatusView
              isSearchContext={true}
              isLoadingState={isRefreshing}
            />
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
    {/if} -->
    <SearchResultsPopover
      bind:this={searchResultsPopover}
      searchCallback={refresh}
      emptyStateLabel="No results found"
      searchResultComponent={LinkSearchResultItem}
      isInlineContext={true}
      isAlwaysShowSearchFeedback={true}
      on:select={onSelect}
      on:empty-enter
      on:reset
      on:hide
    />
  </main>
</div>
