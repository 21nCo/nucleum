<script lang="ts">
  import LinkSearchResultItem from "$lib/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  export let subType: NodeType;
  export let onSelect: (event: CustomEvent) => void;
  let searchQuery = "";
  let searchRef: TextSearchInput;
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
  $: label = subType ? enumToString(subType) + "s" : "";
  onMount(() => {
    setTimeout(() => {
      searchRef?.showDefaultResults();
    }, 100);
  });
</script>

<!-- TODO - improve search results - to show image preview, tweet preview, etc -->
<TextSearchInput
  bind:this={searchRef}
  bind:value={searchQuery}
  isInline={true}
  {searchCallback}
  placeholder={`Search ${label}`}
  emptyStateLabel="No results found"
  searchResultComponent={LinkSearchResultItem}
  searchResultComponentProps={{
    isHideResourceType: true
  }}
  on:select={onSelect}
/>
