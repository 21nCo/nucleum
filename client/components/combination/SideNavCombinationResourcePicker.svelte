<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import LinkSearchResultItem from "$lib/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  const dispatch = createEventDispatcher();

  const resourceOptions: ISelectItem[] = [
    {
      label: "Nodes",
      value: Resource.node,
      icon: "hexagon"
    },
    {
      label: "Collections",
      value: Resource.collection,
      icon: "collection"
    },
    {
      label: "Combinations",
      value: Resource.combination,
      icon: "combination"
    }
  ];

  let resourceType: Resource = Resource.node;
  let searchStore = new SearchStore(resourceType);
  $: searchStore = new SearchStore(resourceType);
  $: searchResultProps = {
    resourceType,
    isHideResourceType: false
  };

  async function searchCallback(value: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return [];
    }
    const results = await searchStore.select({
      resource: resourceType,
      searchQuery: trimmed,
      limit: 30,
      isExpand: false
    });
    return Array.isArray(results) ? results : [];
  }
</script>

<div class="flex flex-col gap-3">
  <OptionSelector
    size={Size.sm}
    class={cn("w-full")}
    options={resourceOptions}
    bind:selected={resourceType}
  />
  <TextSearchInput
    placeholder="Search resources"
    icon="magnifying-glass"
    searchCallback={searchCallback}
    searchResultComponent={LinkSearchResultItem}
    searchResultComponentProps={searchResultProps}
    isInline={true}
    on:select={(e) => {
      if (!e.detail?.item) return;
      dispatch("select", {
        item: e.detail.item,
        resourceType
      });
    }}
  />
</div>
