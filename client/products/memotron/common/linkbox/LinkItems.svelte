<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LinkItem from "./LinkItem.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    determineResourceType,
    removeDuplicatesFilter
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { collectionStore } from "../../collection/collection.store";
  import PropertiesListView from "../../collection/properties/PropertiesListView.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import LinkTagger from "../../linking/LinkTagger.svelte";
  import type { INodeLinkThumb } from "../../node/node.type";
  import { linker } from "../../linking/link.store";
  import LinkTags from "../../linking/LinkTags.svelte";
  const dispatch = createEventDispatcher();
  export let links: IRecordId[];
  export let propertyValues: INodePropertyValue[] = [];
  export let isWrapItems: boolean = false;
  export let parentBgIndex: number = 1;
  export let isExpandable: boolean = false;
  export let nodeId: IRecordId | undefined = undefined;
  let expand: IRecordId | null = null;
  let expansionState:
    | "not-type"
    | "node"
    | "no-props"
    | "has-props"
    | "loading"
    | "error" = "loading";
  let types: any[] = [];
  let link: INodeLinkThumb;
  $: _links = links?.filter(removeDuplicatesFilter) ?? [];

  async function refreshExpansion(item: IRecordId) {
    expansionState = "loading";
    const type = determineResourceType(item);
    if (type === Resource.collection) {
      const result = await collectionStore.resolveTypes([item], true);
      console.log({ at: "refreshExpansion", result });
      if (result && isValidArrayWithData(result)) {
        types = result;
        if (
          types[0]?.properties?.length > 0 ||
          types[0]?.extendProperties?.length > 0
        )
          expansionState = "has-props";
        else expansionState = "no-props";
      } else {
        expansionState = "not-type";
      }
    } else if (type === Resource.node) {
      if (!nodeId) {
        expansionState = "error";
        return;
      }
      const linkResult = await linker.selectMany({
        filters: {
          in: nodeId.toString(),
          out: item.toString()
        }
      });
      if (linkResult && isValidArrayWithData(linkResult)) {
        link = linkResult[0];
        expansionState = "node";
      } else {
        expansionState = "error";
      }
    }
  }
</script>

{#if _links?.length > 0}
  <div
    class={cn("flex gap-2 w-full", {
      "flex-wrap": isWrapItems,
      "overflow-x-auto": !isWrapItems
    })}
  >
    {#each _links as item (item.toString())}
      <LinkItem
        id={item}
        {parentBgIndex}
        isActive={expand === item}
        on:click={(e) => {
          if (isExpandable) {
            expand = expand === item ? null : item;
            if (expand) refreshExpansion(item);
            e.stopPropagation();
          } else {
            dispatch("click", {
              item,
              event: e
            });
          }
        }}
        on:remove={() => {
          dispatch("unlink", item);
        }}
      />
    {/each}
  </div>
  {#if isExpandable && expand}
    {#if expansionState === "loading" || expansionState === "not-type" || expansionState === "no-props" || expansionState === "error"}
      <div
        class={cn("flex justify-center items-center w-full h-full", {
          "text-ars1": expansionState === "error"
        })}
      >
        {#if expansionState === "loading"}
          loading...
        {:else if expansionState === "not-type"}
          Not a typed collection.
        {:else if expansionState === "no-props"}
          No properties found.
        {:else if expansionState === "error"}
          Something went wrong.
        {/if}
      </div>
    {:else if expansionState === "node"}
      <LinkTagger bind:link />
      {#if link?.tags && link.tags.length > 0}
        <LinkTags bind:link />
      {/if}
    {:else if expansionState === "has-props"}
      <PropertiesListView
        {types}
        values={propertyValues}
        context="clip"
        on:change={(e) => {
          dispatch("propertyChange", e.detail);
        }}
      />
    {/if}
  {/if}
{/if}
