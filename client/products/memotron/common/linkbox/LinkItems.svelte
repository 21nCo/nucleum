<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LinkItem from "./LinkItem.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    determineResourceType,
    isSameResource,
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
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import context from "$lib/client/stores/context.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { ICollectionItemPropertyValue } from "$lib/client/components/collection/collection.type";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import view from "$lib/client/stores/view.store";
  const dispatch = createEventDispatcher();
  export let links: IRecordId[];
  export let propertyValues: ICollectionItemPropertyValue[] = [];
  export let isWrapItems: boolean = false;
  export let parentBgIndex: number = 1;
  export let isExpandable: boolean = false;
  export let nodeId: IRecordId | undefined = undefined;
  export let isReadOnlyMode: boolean = false;
  export let expand: IRecordId | null = null;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CLIPPER;
  export let subContext: "clipper-modal" | undefined = undefined;
  // export let ctx: "clip" | "capture" = "clip";
  let expansionState:
    | "not-type"
    | "node"
    | "no-props"
    | "has-props"
    | "loading"
    | "error" = "loading";
  let types: any[] = [];
  let link: INodeLinkThumb;
  let propertyCount: number | undefined = undefined;
  $: _links = links?.filter(removeDuplicatesFilter) ?? [];
  $: if (expand) {
    refreshExpansion(expand);
  }

  async function refreshExpansion(item: IRecordId) {
    try {
      expansionState = "loading";
      propertyCount = undefined;
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
          link = { links: linkResult, linkedTo: nodeId };
          expansionState = "node";
        } else {
          expansionState = "error";
        }
      }
      propagateExpansionState();
    } catch (e) {
      console.error(e);
      expansionState = "error";
    }
  }

  function propagateExpansionState() {
    dispatch("expansion", expand ? expansionState : null);
  }

  function onClickItem(item: IRecordId, e: any) {
    if (isExpandable) {
      expand = expand && isSameResource(expand, item) ? null : item;
      if (expand) refreshExpansion(item);
      propagateExpansionState();
      e.stopPropagation();
    } else {
      dispatch("click", {
        item,
        event: e
      });
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
        {accessPoint}
        isAlwaysShowRemove={accessPoint === ResourceAccessPoint.CAPTURE ||
          accessPoint === ResourceAccessPoint.CLIPPER}
        isRemovable={!isReadOnlyMode &&
          (accessPoint !== ResourceAccessPoint.SELF ||
            (accessPoint === ResourceAccessPoint.SELF &&
              !$context.isTouchDevice))}
        isActive={expand && isSameResource(expand, item) ? true : undefined}
        on:click={(e) => {
          if (
            $context.isTouchDevice &&
            accessPoint === ResourceAccessPoint.SELF
          )
            return;
          onClickItem(item, e);
        }}
        on:goToResource={(e) => {
          onClickItem(item, e);
        }}
        on:remove={() => {
          if (expand && isSameResource(expand, item)) {
            expand = null;
          }
          dispatch("unlink", item);
        }}
      />
    {/each}
  </div>
  {#if isExpandable && expand}
    {#if expansionState === "loading" || expansionState === "not-type" || expansionState === "no-props" || expansionState === "error"}
      <div
        class={cn(
          "flex justify-center items-center w-full h-full text-fgs3 cw:text-b3 px-1 py-2 text-b2",
          {
            "text-ars1": expansionState === "error"
          }
        )}
        in:fly={{
          y: -20,
          duration: 300,
          easing: quintOut
        }}
      >
        {#if expansionState === "loading"}
          loading...
        {:else if expansionState === "not-type"}
          Not a typed collection.
        {:else if expansionState === "no-props"}
          No properties found.
        {:else if expansionState === "error" && accessPoint === ResourceAccessPoint.CAPTURE}
          Adding relationship to node links is not available yet for capture
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
        class={cn("w-full p-2 rounded-md flex flex-col gap-3 items-start", {
          "h-96 bg-bgs2 bg-opacity-30":
            accessPoint === ResourceAccessPoint.CLIPPER &&
            subContext !== "clipper-modal",
          "h-60":
            accessPoint === ResourceAccessPoint.CLIPPER &&
            subContext === "clipper-modal",
          "h-fit max-h-96": accessPoint === ResourceAccessPoint.CAPTURE
        })}
        in:fly={{
          y: -20,
          duration: 300,
          easing: quintOut
        }}
      >
        <Text
          content={`${types[0]?.label ? types[0].label + ":" : ""} Properties (${propertyCount ?? ""})`}
          style={TextStyle.SECTION_HEADING_SMALL}
        />
        <div class="overflow-y-auto h-full w-full styledscroll">
          <PropertiesListView
            parentBgIndex={accessPoint === ResourceAccessPoint.CAPTURE &&
            $view.isPortrait
              ? 2
              : 1}
            {types}
            values={propertyValues}
            resource={Resource.node}
            context="clip"
            on:change={(e) => {
              dispatch("propertyChange", e.detail);
            }}
            on:propertyCount={(e) => {
              propertyCount = e.detail;
            }}
          />
          {#if accessPoint === ResourceAccessPoint.CLIPPER}
            <ScrollViewBottomSpacer />
          {/if}
        </div>
      </div>
    {/if}
  {/if}
{/if}
