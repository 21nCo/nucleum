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
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import PropertiesListView from "$lib/client/components/collection/properties/PropertiesListView.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import LinkTagger from "$lib/client/products/memotron/linking/LinkTagger.svelte";
  import type { INodeLinkThumb } from "$lib/client/products/memotron/node/node.type";
  import { linker } from "$lib/client/products/memotron/linking/link.store";
  import LinkTags from "$lib/client/products/memotron/linking/LinkTags.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  const dispatch = createEventDispatcher();
  export let links: IRecordId[];
  export let propertyValues: INodePropertyValue[] = [];
  export let isWrapItems: boolean = false;
  export let parentBgIndex: number = 1;
  export let isExpandable: boolean = false;
  export let nodeId: IRecordId | undefined = undefined;
  export let isReadOnlyMode: boolean = false;
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
    propagateExpansionState();
  }

  function propagateExpansionState() {
    dispatch("expansion", expand ? expansionState : null);
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
        isRemovable={!isReadOnlyMode}
        isActive={expand === item}
        on:click={(e) => {
          if (isExpandable) {
            expand = expand === item ? null : item;
            if (expand) refreshExpansion(item);
            propagateExpansionState();
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
      <div
        class="w-full h-96 p-2 rounded-md bg-bgs2 bg-opacity-30 flex flex-col gap-3 items-start"
      >
        <Text
          content={`${types[0]?.label ? types[0].label + ":" : ""} Properties (${types[0]?.properties?.length})`}
          style={TextStyle.SECTION_HEADING_SMALL}
        />
        <div class="overflow-y-auto h-full w-full styledscroll">
          <PropertiesListView
            {types}
            values={propertyValues}
            context="clip"
            on:change={(e) => {
              dispatch("propertyChange", e.detail);
            }}
          />
          <ScrollViewBottomSpacer />
        </div>
      </div>
    {/if}
  {/if}
{/if}
