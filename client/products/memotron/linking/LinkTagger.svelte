<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import {
    linker,
    linkTagStore
  } from "@21n/products/memotron/linking/link.store";
  import type { INodeLinkThumb } from "@21n/products/memotron/node/node.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { LinkType } from "@21n/products/memotron/linking/link.type";

  let {
    link = $bindable(),
    onTag = undefined
  }: {
    link: INodeLinkThumb;
    onTag?: ((event: CustomEvent<IRecordId>) => void) | undefined;
  } = $props();
  let searchQuery = $state("");
  let searchInputRef: any;
  async function handleSelect(e: CustomEvent) {
    if (!e.detail.item) return;
    processSelect(e.detail.item.id);
  }

  function emitTag(id: IRecordId) {
    const tagEvent = new CustomEvent<IRecordId>("tag", {
      detail: id
    });
    onTag?.(tagEvent);
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
    emitTag(id);
  }

  async function onEmptyEnter() {
    const result = await linkTagStore.save(searchQuery);
    const savedLinkTag = Array.isArray(result) ? result[0] : result;
    if (savedLinkTag) {
      processSelect(savedLinkTag.id);
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

<button
  onclick={(event) => {
    event.stopPropagation();
  }}
  class="w-full"
>
  <TextSearchInput
    bind:this={searchInputRef}
    bind:value={searchQuery}
    style={InputStyle.PLAIN}
    {searchCallback}
    onSelect={handleSelect}
    onEmptyEnter={onEmptyEnter}
    emptyStateLabel="No relations found. Press enter to create a new relation"
    placeholder="Start typing to add relations"
  />
</button>
