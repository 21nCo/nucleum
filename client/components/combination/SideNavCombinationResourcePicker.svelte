<script lang="ts">
  import TextSearchInput from "@21n/client/elements/input/TextSearchInput.svelte";
  import LinkSearchResultItem from "@21n/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import { datafn } from "@21n/stores/datafn.store";
  import { resolveProductResources } from "@21n/data/datafn/resource.utils";
  import { appStore } from "@21n/stores/app.store";

  let {
    onSelect = undefined
  }: {
    onSelect?: ((event: CustomEvent<{ item: any }>) => void) | undefined;
  } = $props();

  async function searchCallback(value: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return [];
    }
    const searchResult = await datafn.search({
      query: trimmed,
      resources: resolveProductResources($appStore.product, "search"),
      fields: ["label"],
      limit: 30,
      limitPerResource: 30,
      source: "local",
      prefix: true,
      fuzzy: 0.2
    });
    return (
      (searchResult as { results?: { data: unknown }[] }).results?.map(
        (entry) => entry.data
      ) ?? []
    );
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
