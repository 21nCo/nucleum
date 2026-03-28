<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import type { IAction } from "@21n/types/action.type";
  import { Size } from "@21n/types/size.enum";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { createEventDispatcher } from "svelte";
  import ResultItem from "@21n/components/commandBar/ResultItem.svelte";
  import type { IResource } from "@21n/components/flux/resourceStores/resource.type";
  import TextWithHoverTooltip from "@21n/elements/text/TextWithHoverTooltip.svelte";
  import { debouncer } from "@21n/utils/utils";
  import { logger } from "@21n/components/debug/logger.client";
  import BreadcrumbMini from "@21n/elements/breadcrumb/BreadcrumbMini.svelte";

  const dispatch = createEventDispatcher();
  export let action: IAction;
  export let componentParams: any = undefined;
  export let search: string = "";
  type SearchActionResult = IResource &
    Partial<{
      label: string;
      parent: {
        hierarchy: Array<{ label: string }>;
      };
    }> &
    Record<string, unknown>;
  let selectedIndex: number = 0;
  let isSearchInProgress: boolean = false;
  let results: SearchActionResult[] = [];

  function resolveHierarchy(result: SearchActionResult) {
    const parent = result.parent;
    if (!parent?.hierarchy) return [];
    return parent.hierarchy
      .filter(
        (item): item is { label: string } =>
          Boolean(item) && typeof item.label === "string"
      )
      .map((item) => item.label);
  }

  function resolveLabel(result: SearchActionResult) {
    return typeof result.label === "string" ? result.label : "";
  }

  function resetSearch() {
    results = [];
    selectedIndex = 0;
  }
  $: if (search || search === "") debouncedSearch();
  const debouncedSearch = debouncer(searchResources, 500);
  async function searchResources() {
    try {
      resetSearch();
      if (!action.searchActionParams?.searchCallback) return;
      isSearchInProgress = true;
      selectedIndex = 0;
      if (action.searchActionParams?.searchCallback) {
        const searchResults = await action.searchActionParams.searchCallback(
          search,
          componentParams
        );
        results = Array.isArray(searchResults) ? searchResults : [];
      }
      isSearchInProgress = false;
    } catch (e) {
      logger.error({ at: "Cmd bar - SearchActionResults", error: e });
    }
  }
  export function select() {
    const selectedItem = results[selectedIndex];
    if (!selectedItem.id) return;
    action.searchActionParams?.callback(selectedItem, componentParams);
    dispatch("close");
  }
  export function moveSelection(direction: "up" | "down") {
    let nextIndex = selectedIndex;
    if (direction === "down") {
      nextIndex = Math.min(selectedIndex + 1);
      if (nextIndex === results?.length) {
        nextIndex = 0;
      }
    } else if (direction === "up") {
      nextIndex = Math.max(selectedIndex - 1, -1);
      if (nextIndex === -1) {
        nextIndex = results?.length - 1;
      }
    }
    selectedIndex = nextIndex;
  }
</script>

{#if isValidArrayWithData(results)}
  {#each results as result, index (result.id)}
    <ResultItem
      isActive={selectedIndex === index}
      on:click={() => {
        selectedIndex = index;
        select();
      }}
      isSearchAction={true}
    >
      {#if action.searchActionParams?.searchResultComponent}
        <svelte:component
          this={action.searchActionParams.searchResultComponent}
          item={result}
        />
      {:else}
        {@const hierarchy = resolveHierarchy(result)}
        <div class="flex flex-col w-full items-start">
          {#if hierarchy.length > 0}
            <BreadcrumbMini hierarchy={hierarchy} />
          {/if}
          <TextWithHoverTooltip
            text={resolveLabel(result)}
            class="text-left truncate w-full max-w-full"
          />
        </div>

        <!-- <span class="flex min-w-0 flex-1">
      <TextWithHoverTooltip text={result.label} class="truncate" />
    </span> -->
        {#if action.searchActionParams?.searchResourceType}
          <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
            {action.searchActionParams?.searchResourceType}
          </div>
        {/if}
      {/if}
    </ResultItem>
  {/each}
{:else}
  <EmptyStatusView
    isLoadingState={isSearchInProgress}
    size={Size.sm}
    loadingText="searching..."
    subText="No matches found!"
  />
{/if}
