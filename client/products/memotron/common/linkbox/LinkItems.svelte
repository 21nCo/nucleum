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
  const dispatch = createEventDispatcher();
  export let links: IRecordId[];
  export let propertyValues: INodePropertyValue[] = [];
  export let isWrapItems: boolean = false;
  export let parentBgIndex: number = 1;
  export let isExpandable: boolean = false;
  let expand: IRecordId | null = null;
  let expansionState:
    | "not-type"
    | "node"
    | "no-props"
    | "has-props"
    | "loading" = "loading";
  let types: any[] = [];
  $: _links = links?.filter(removeDuplicatesFilter) ?? [];

  async function refreshExpansion(item: IRecordId) {
    expansionState = "loading";
    const type = determineResourceType(item);
    if (type === Resource.collection) {
      const result = await collectionStore.resolveTypes([item], true);
      console.log({ at: "refreshExpansion", result });
      if (result && isValidArrayWithData(result)) {
        types = result;
        expansionState = "has-props";
      } else {
        expansionState = "not-type";
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
    {#if expansionState === "loading"}
      <div class="flex justify-center items-center w-full h-full">
        loading...
      </div>
    {:else if expansionState === "not-type"}
      <div class="flex justify-center items-center w-full h-full">
        Not a typed collection.
      </div>
    {:else if expansionState === "node"}
      <div class="flex justify-center items-center w-full h-full">node</div>
    {:else if expansionState === "no-props"}
      <div class="flex justify-center items-center w-full h-full">
        No properties found.
      </div>
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
