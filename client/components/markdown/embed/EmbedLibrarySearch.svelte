<script lang="ts">
  import SearchResultsPopover from "$lib/client/elements/input/SearchResultsPopover.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import LinkSuggestionItem from "$lib/client/products/memotron/common/linkbox/LinkSuggestionItem.svelte";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  export let subType: NodeType;
  export let onSelect: (event: CustomEvent) => void;
  let searchQuery = "";
  let searchResultsPopoverRef: SearchResultsPopover;
  const searchStore = new SearchStore();
  function searchCallback(searchQuery: string) {
    return searchStore.searchForLinking(searchQuery, {
      resource:
        subType === NodeType.COLLECTION_AS_EMBED
          ? Resource.collection
          : Resource.node,
      subType: subType !== NodeType.COLLECTION_AS_EMBED ? subType : undefined
    });
  }
  $: label = enumToString(subType) + "s";
  onMount(() => {
    setTimeout(() => {
      searchResultsPopoverRef?.search();
    }, 100);
  });
</script>

<div
  class="flex flex-col gap-1 bg-bgs1 p-2 rounded-md mo:w-full w-[30rem] max-w-full"
>
  <TextInput
    bind:value={searchQuery}
    placeholder={`Search ${label}`}
    on:keyup={(event) => {
      searchResultsPopoverRef.keyup(event.detail.event);
    }}
  />
  <!-- TODO - improve search results - to show image preview, tweet preview, etc -->
  <SearchResultsPopover
    bind:this={searchResultsPopoverRef}
    {searchCallback}
    emptyStateLabel="No results found"
    searchResultComponent={LinkSuggestionItem}
    on:select={onSelect}
    on:empty-enter
    on:reset
    on:hide
  />
</div>
