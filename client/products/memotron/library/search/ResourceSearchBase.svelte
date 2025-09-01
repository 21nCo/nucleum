<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import { onMount } from "svelte";
  import { isValidString, properCase } from "$lib/shared/utils/text.utils";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import {
    SearchType,
    type IResourceSelectOrderBy
  } from "$lib/client/types/data.type";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import SearchResultsPopover from "$lib/client/elements/input/SearchResultsPopover.svelte";
  import LinkSearchResultItem from "../../common/linkbox/LinkSearchResultItem.svelte";
  import GroupedSearchResults from "./GroupedSearchResults.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import {
    determineResourceType,
    resolveProductResources,
    resolveResourceIcon
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { tabs } from "$lib/client/layout/topNav/tabs/tabs.store";
  import { isInlineAvailable } from "$lib/client/components/library/library.utils";
  import { KeyboardKey, ModifierKey } from "$lib/client/types/keyboard.type";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let resource: Resource = Resource.everything;
  export let isGlobalSearchModal: boolean = false;
  export let isExpanded: boolean = isGlobalSearchModal;
  export let parentBgIndex: number = 1;
  export let searchQuery: string = "";
  let isFiltersVisible: boolean = false;
  let data: any[] = [];
  let recents: any[] = [];
  let searchStore = new SearchStore();
  let isRefreshing: boolean = false;
  let searchResultsPopover: SearchResultsPopover;
  let dev_enableSemanticSearch: boolean = false;
  let groupedSearchRef: GroupedSearchResults;
  const resources = resolveProductResources($appStore.product, "search");
  const switchItems = [
    {
      label: "Everything",
      value: Resource.everything,
      icon: "asterisk"
    },
    ...(resources ?? [])
      .filter((x) => !($view.isConstrainedWidth && x === Resource.task))
      .map((x) => ({
        label: properCase(x) + "s",
        value: x,
        icon: resolveResourceIcon(x)
      }))
  ];
  onMount(async () => {
    if (isExpanded) {
      searchResultsPopover?.search();
      groupedSearchRef?.search();
    }
    // await refresh();
  });

  export function search() {
    if (resource === Resource.everything) {
      groupedSearchRef?.search();
    } else {
      searchResultsPopover?.search();
    }
  }

  export function keydown(event: KeyboardEvent) {
    if (resource === Resource.everything) {
      groupedSearchRef?.keydown(event);
    } else {
      searchResultsPopover?.keydown(event);
    }
  }

  export function keyup(event: KeyboardEvent) {
    if (resource === Resource.everything) {
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
        data = await searchStore.select({
          resource: resourceType ?? resource,
          searchQuery,
          orderBy,
          semanticSearchTopK,
          limit: 150
        });
      } else {
        data = [];
        recents = recentsStore.resolve({ type: resourceType ?? resource });
        return recents;
      }
      return data;
    } catch (e) {
      logger.error({ at: "ResourceSearchModal.refresh", error: e });
    } finally {
      isRefreshing = false;
    }
  }

  function onSelect(
    e: CustomEvent<{ item: any; event: MouseEvent | undefined; group?: any }>
  ) {
    const item = e.detail.item;
    if (!item || !item?.id) {
      if (resource === Resource.everything) {
        const group = e.detail.group;
        if (group) {
          expandGroup(group.value);
        }
      }
      return;
    }
    const clickAccessMode = e.detail.event
      ? appStore.determineClickAccessMode(e.detail.event)
      : undefined;
    if (!clickAccessMode) {
      const resourceType = determineResourceType(item.id);
      if (isInlineAvailable(resourceType)) {
        tabs.activate(item.id);
        return;
      }
    }
    appStore.resourceClickHandler(e.detail.event, item.id);
  }

  function expandGroup(resourceType: Resource) {
    resource = resourceType;
    setTimeout(() => {
      searchResultsPopover?.search(searchQuery);
    }, 100);
  }
</script>

<div
  class={cn("flex flex-col gap-4 w-full h-full", {
    "bg-bgs2": isGlobalSearchModal && resource === Resource.everything
  })}
>
  <header class={"flex flex-col w-full"}>
    <div class="flex gap-1" class:p-4={isGlobalSearchModal}>
      <span class="min-w-0 flex-1">
        <slot />
      </span>
      {#if isExpanded}
        <div class="flex h-full items-center gap-2 pr-4">
          {#if $view.isConstrainedWidth}
            <Button
              icon="cross"
              size={Size.lg}
              style={ButtonStyle.OUTLINED}
              on:click={() => {
                dispatch("close");
              }}
            />
          {/if}
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
        bind:value={resource}
        style={PanelSwitcherStyle.BAR}
        isExpandToFullWidth={true}
        parentBgIndex={isGlobalSearchModal && resource === Resource.everything
          ? 2
          : parentBgIndex}
        size={Size.sm}
        on:switch={() => {
          setTimeout(() => {
            if (resource === Resource.everything) {
              groupedSearchRef?.search(searchQuery);
            } else {
              searchResultsPopover?.search(searchQuery);
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
      {#if resource === Resource.everything}
        <div class="flex flex-col justify-between w-full h-full p-2">
          <div class="flex flex-grow w-full">
            <GroupedSearchResults
              bind:this={groupedSearchRef}
              searchCallback={(query, resourceType) => {
                return refresh(query, resourceType);
              }}
              isDefaultState={!searchQuery}
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
            shortcut={{
              key: KeyboardKey.ESCAPE
            }}
            parentBgIndex={1}
            isAlwaysShown={true}
          />
          to close
        </span>
        {#if resource === Resource.everything}
          <span class="inline-flex items-center gap-1">
            Press
            <ShortcutText
              shortcut={{
                key: KeyboardKey.ARROW_RIGHT,
                modifiers: [ModifierKey.META]
              }}
              parentBgIndex={1}
              isAlwaysShown={true}
            /> to switch between result groups
          </span>
        {/if}
      </div>
    {/if}
  {/if}
</div>
