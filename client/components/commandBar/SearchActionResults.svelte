<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import PageLoadingAnimation from "$lib/client/elements/feedback/animations/PageLoadingAnimation.svelte";
  import { Persistance } from "$lib/client/stores/persistance";
  import type { Action } from "$lib/client/types/action.type";
  import type { DbRecordWithLabel } from "$lib/client/types/dbrecord.type";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { createEventDispatcher } from "svelte";
  import ResultItem from "./ResultItem.svelte";
  const dispatch = createEventDispatcher();
  export let action: Action;
  export let search: string = "";
  let selectedIndex: number = 0;
  let isSearchInProgress: boolean = false;
  let results: DbRecordWithLabel[] = [];
  function resetSearch() {
    results = [];
    selectedIndex = 0;
  }
  $: if (search) searchResources();
  async function searchResources() {
    if (!action.searchActionParams?.searchItemType) return;
    isSearchInProgress = true;
    selectedIndex = 0;
    results = await new Persistance().searchByLabel(
      search,
      action.searchActionParams?.searchItemType
    );
    isSearchInProgress = false;
  }
  export function select() {
    const selectedItem = results[selectedIndex];
    if (!selectedItem.id) return;
    action.searchActionParams?.callback(
      selectedItem.id.toString(),
      selectedItem.label
    );
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
  {#each results as result, index}
    <ResultItem
      isActive={selectedIndex === index}
      on:click={() => {
        selectedIndex = index;
        select();
      }}
      >{result.label}
      <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
        {action.searchActionParams?.itemLabel}
      </div>
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
