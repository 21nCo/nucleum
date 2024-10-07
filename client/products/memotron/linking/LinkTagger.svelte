<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { linker, linkTagStore } from "./link.store";
  import type { INodeLinkThumb } from "../node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { logger } from "$lib/client/components/debug/logger.client";
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
</script>

<button on:click|stopPropagation class="w-full">
  <TextSearchInput
    bind:this={searchInputRef}
    bind:value={searchQuery}
    style={InputStyle.PLAIN}
    searchStoreId={Resource.linkTag}
    on:select={onselect}
    on:empty-enter={onEmptyEnter}
    emptyStateLabel="No tags found. Press enter to create a new tag"
    placeholder="Start typing to add link tags"
  />
</button>
