<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { Size } from "@21n/types/size.enum";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { SearchStore } from "@21n/components/record/record.store";
  import { recentsStore } from "@21n/components/record/recent.store";
  import { onMount, onDestroy } from "svelte";
  import { isValidString, properCase } from "@21n/shared-utils/text.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { type IResourceSelectOrderBy } from "@21n/types/data.type";
  import { ButtonStyle } from "@21n/types/button.type";
  import { logger } from "@21n/components/debug/logger.client";
  import SearchResultsPopover from "@21n/elements/input/SearchResultsPopover.svelte";
  import LinkSearchResultItem from "@21n/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import GroupedSearchResults from "@21n/products/memotron/library/search/GroupedSearchResults.svelte";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import {
    resolveProductResources,
    resolveResourceIcon
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import { createEventDispatcher } from "svelte";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { Action } from "@21n/types/action.enum";
  import { searchStore } from "@21n/components/search";
  import { AppSearchParam } from "@21n/types/appStore.type";

  const dispatch = createEventDispatcher();

  export let isGlobalSearchModal: boolean = false;
  export let isInline: boolean = false;
  export let isExpanded: boolean = isGlobalSearchModal;
  export let parentBgIndex: number = 1;

  let isFiltersVisible: boolean = false;
  let data: any[] = [];
  let recents: any[] = [];
  let resourceSearch = new SearchStore();
  let isRefreshing: boolean = false;
  let searchResultsPopover: SearchResultsPopover;
  let groupedSearchRef: GroupedSearchResults;
  const resources = resolveProductResources($appStore.product, "search");
  const switchItems = [
    {
      label: "Everything",
      value: Resource.everything,
      icon: "asterisk"
    },
    ...(resources ?? []).map((x) => ({
      label: properCase(x) + "s",
      value: x,
      icon: resolveResourceIcon(x)
    }))
  ];

  $: isGroupedResultsMode =
    !$view.isConstrainedWidth &&
    $searchStore.resourceType === Resource.everything;

  onMount(async () => {
    searchStore.setKeyboardHandlers({
      keyup: (event) => keyup(event),
      keydown: (event) => keydown(event)
    });

    if (isExpanded) {
      searchResultsPopover?.search();
      groupedSearchRef?.search();
    }
  });

  onDestroy(() => {
    searchStore.clearKeyboardHandlers();
  });

  export function search() {
    if (isGroupedResultsMode) {
      groupedSearchRef?.search();
    } else {
      searchResultsPopover?.search();
    }
  }

  export function keydown(event: KeyboardEvent) {
    if (isGroupedResultsMode) {
      groupedSearchRef?.keydown(event);
    } else {
      searchResultsPopover?.keydown(event);
    }
  }

  export function keyup(event: KeyboardEvent) {
    if (isGroupedResultsMode) {
      groupedSearchRef?.keyup(event);
    } else {
      searchResultsPopover?.keyup(event);
    }
  }

  async function refresh(searchQuery?: string, resourceType?: Resource) {
    try {
      if (isValidString(searchQuery)) {
        isRefreshing = true;
        let orderBy: IResourceSelectOrderBy | undefined;
        let semanticSearchTopK: number | undefined;
        // if (searchStore.searchType == SearchType.SEMANTIC) {
        //   orderBy = {
        //     dist: "desc",
        //     createdAt: "desc"
        //   };
        // }
        data = await resourceSearch.select({
          resource: resourceType ?? $searchStore.resourceType,
          searchQuery,
          orderBy,
          semanticSearchTopK,
          limit: 150
        });
      } else {
        data = [];
        recents = recentsStore.resolve({
          type: resourceType ?? $searchStore.resourceType
        });
        return recents;
      }
      return data;
    } catch (e) {
      logger.error({ at: "ResourceSearchModal.refresh", error: e });
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * Defaulting to FULL access mode for portrait - since in this layout - tab bar isn't available
   * @param e
   */
  function onSelect(
    e: CustomEvent<{ item: any; event: MouseEvent | undefined; group?: any }>
  ) {
    const item = e.detail.item;
    if (!item || !item?.id) {
      if ($searchStore.resourceType === Resource.everything) {
        const group = e.detail.group;
        if (group) {
          expandGroup(group.value);
        }
      }
      return;
    }
    if ($view.isPortrait) {
      appStore.openResource(item.id, ResourceAccessMode.FULL);
      return;
    }
    appStore.toggleSearchParam([AppSearchParam.SEARCH]);
    appStore.resourceClickHandler(e.detail.event, item.id, {
      origin: Action.GLOBAL_SEARCH
    });
  }

  function expandGroup(resourceType: Resource) {
    searchStore.setResourceType(resourceType);
    setTimeout(() => {
      searchResultsPopover?.search($searchStore.query);
    }, 100);
  }
</script>

<div
  class={cn("flex flex-col w-full h-full", {
    "otop:pt-12": isGlobalSearchModal
  })}
>
  <header class={"flex flex-col w-full"}>
    <div
      class={cn("flex gap-1", {
        "py-3": isGlobalSearchModal && !isInline
      })}
    >
      <span class="min-w-0 flex-1">
        <slot />
      </span>
      {#if isExpanded}
        <div class="flex h-full items-center gap-2 pr-4">
          {#if !isGlobalSearchModal}
            <Button
              icon="cross"
              size={Size.lg}
              style={ButtonStyle.OUTLINED}
              on:click={() => {
                searchStore.reset();
                dispatch("close");
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
      {/if}
    </div>
    {#if isExpanded}
      <PanelSwitcher
        items={switchItems}
        value={$searchStore.resourceType}
        style={PanelSwitcherStyle.BAR}
        isExpandToFullWidth={true}
        {parentBgIndex}
        size={Size.sm}
        on:switch={(e) => {
          searchStore.setResourceType(e.detail);
          setTimeout(() => {
            if (isGroupedResultsMode) {
              groupedSearchRef?.search($searchStore.query);
            } else {
              searchResultsPopover?.search($searchStore.query);
            }
          }, 100);
        }}
      />
    {/if}
  </header>
  {#if isExpanded}
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
      {#if isGroupedResultsMode}
        <div class="flex flex-col justify-between w-full h-full">
          <div class="flex flex-grow w-full">
            <GroupedSearchResults
              bind:this={groupedSearchRef}
              searchCallback={(query, resourceType) => {
                return refresh(query, resourceType);
              }}
              isDefaultState={!$searchStore.query}
              groups={switchItems.filter(
                (x) => x.value !== Resource.everything
              )}
              on:expand={(e) => {
                const resourceType = e.detail?.group?.value;
                if (!resourceType) return;
                expandGroup(resourceType);
              }}
              on:select={onSelect}
            />
          </div>
        </div>
      {:else}
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
      {/if}
    </main>
    {#if $context.embed !== Embed.HANDSET}
      <div
        class="flex w-full h-8 min-h-[2rem] bg-bgs2 justify-between items-center text-b3 text-fgs3 px-4 rounded-b-md"
      >
        <span class="inline-flex items-center gap-1">
          Press
          <ShortcutText
            shortcut={Action.GLOBAL_SEARCH}
            parentBgIndex={2}
            isAlwaysShown={true}
          />
          to toggle global search
        </span>
        {#if isGroupedResultsMode}
          <span class="inline-flex items-center gap-1">
            Press
            <ShortcutText
              shortcut={{
                key: KeyboardKey.ARROW_RIGHT,
                modifiers: [ModifierKey.META, ModifierKey.SHIFT]
              }}
              parentBgIndex={2}
              isAlwaysShown={true}
            /> to switch between result groups
          </span>
        {/if}
      </div>
    {/if}
  {/if}
</div>
