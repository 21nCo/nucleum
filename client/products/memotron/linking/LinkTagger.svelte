<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { linker, linkTagStore } from "@21n/products/memotron/linking/link.store";
  import type { INodeLinkThumb } from "@21n/products/memotron/node/node.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { logger } from "@21n/components/debug/logger.client";
  const dispatch = createEventDispatcher();

  export let link: INodeLinkThumb;
  let searchQuery = "";
  let searchInputRef: any;
  async function onselect(e: CustomEvent) {
    if (!e.detail.item) return;
    processSelect(e.detail.item.id);
  }

  async function processSelect(id: IRecordId) {
    link.tags = [...(link.tags || []), id];
    const result = await linker.modify(link.id, {
      tags: link.tags
    });
    logger.log({ at: "processSelect", result });
    dispatch("tag", id);
  }

  async function onEmptyEnter() {
    const result = await linkTagStore.save(searchQuery);
    if (result) {
      processSelect(result[0].id);
    }
    searchQuery = "";
    searchInputRef?.reset();
  }

  /**
   *
   * Note: using searchCallback instead of searchStoreId as linkTagStore is in memory store and it fails in extension environment as background script is ephemeral.
   * @param query
   */
  async function searchCallback(query: string) {
    return linkTagStore.search(query);
  }
</script>

<button on:click|stopPropagation class="w-full">
  <TextSearchInput
    bind:this={searchInputRef}
    bind:value={searchQuery}
    style={InputStyle.PLAIN}
    {searchCallback}
    on:select={onselect}
    on:empty-enter={onEmptyEnter}
    emptyStateLabel="No relations found. Press enter to create a new relation"
    placeholder="Start typing to add relations"
  />
</button>
