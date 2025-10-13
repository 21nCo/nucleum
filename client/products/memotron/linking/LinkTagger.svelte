<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { linker, linkTagStore } from "./link.store";
  import type { INodeLinkThumb } from "../node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { LinkType } from "./link.type";
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
    const linkId =
      link.links?.find((x) => x.linkType === LinkType.DIRECT)?.id ??
      link.links?.[0].id;
    if (!linkId) return;
    const result = await linker.modify(linkId, {
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
