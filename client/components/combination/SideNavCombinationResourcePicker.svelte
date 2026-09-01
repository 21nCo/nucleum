<script lang="ts">
  import TextSearchInput from "@21n/client/elements/input/TextSearchInput.svelte";
  import { SearchStore } from "@21n/client/components/record/record.store";
  import LinkSearchResultItem from "@21n/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";

  const searchStore = new SearchStore();

  let { onSelect = undefined }: {
    onSelect?: ((event: CustomEvent<{ item: any }>) => void) | undefined;
  } = $props();

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
    value=""
    placeholder="Add existing resource"
    icon="magnifying-glass"
    {searchCallback}
    searchResultComponent={LinkSearchResultItem}
    onSelect={(e) => {
      if (!e.detail?.item) return;
      onSelect?.(
        new CustomEvent("select", {
          detail: {
            item: e.detail.item
          }
        })
      );
    }}
  />
</div>
