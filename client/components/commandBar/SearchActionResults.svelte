<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { createEventDispatcher } from "svelte";
  import ResultItem from "./ResultItem.svelte";
  import type { IResource } from "../flux/resourceStores/resource.type";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import { debouncer } from "$lib/client/utils/utils";
  import { logger } from "../debug/logger.client";
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";

  const dispatch = createEventDispatcher();
  export let action: IAction;
  export let componentParams: any = undefined;
  export let search: string = "";
  let selectedIndex: number = 0;
  let isSearchInProgress: boolean = false;
  let results: IResource[] = [];
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
        results = await action.searchActionParams.searchCallback(
          search,
          componentParams
        );
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
        <div class="flex flex-col w-full items-start">
          {#if result.parent?.hierarchy}
            <BreadcrumbMini
              hierarchy={result.parent.hierarchy.map((x) => x.label)}
            />
          {/if}
          <TextWithHoverTooltip
            text={result.label}
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
