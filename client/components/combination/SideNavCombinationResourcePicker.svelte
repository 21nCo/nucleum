<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import TextSearchInput from "@21n/client/elements/input/TextSearchInput.svelte";
  import OptionSelector from "@21n/client/elements/select/OptionSelector.svelte";
  import type { ISelectItem } from "@21n/client/types/select.type";
  import { SearchStore } from "@21n/client/components/record/record.store";
  import LinkSearchResultItem from "@21n/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import { Resource } from "@21n/client/components/flux/resourceStores/resource.enum";
  import { Size } from "@21n/client/types/size.enum";
  import { cn } from "@21n/client/utils/ui.utils";

  const dispatch = createEventDispatcher();

  const searchStore = new SearchStore();

  async function searchCallback(value: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return [];
    }
    const results = await searchStore.select({
      searchQuery: trimmed,
      limit: 30,
      isExpand: false
    });
    return Array.isArray(results) ? results : [];
  }
</script>

<div class="flex flex-col gap-3 w-full">
  <TextSearchInput
    placeholder="Add existing resource"
    icon="magnifying-glass"
    {searchCallback}
    searchResultComponent={LinkSearchResultItem}
    on:select={(e) => {
      if (!e.detail?.item) return;
      dispatch("select", {
        item: e.detail.item
      });
    }}
  />
</div>
