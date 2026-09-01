<script lang="ts">
  import LinkItem from "@21n/products/memotron/common/linkbox/LinkItem.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import type { IRecordId } from "@21n/types/data.type";
  import {
    determineResourceType,
    isSameResource,
    removeDuplicatesFilter
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { collectionStore } from "@21n/components/collection/collection.store";
  import PropertiesListView from "@21n/components/collection/properties/PropertiesListView.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import LinkTagger from "@21n/products/memotron/linking/LinkTagger.svelte";
  import type { INodeLinkThumb } from "@21n/products/memotron/node/node.type";
  import { linker } from "@21n/products/memotron/linking/link.store";
  import LinkTags from "@21n/products/memotron/linking/LinkTags.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import context from "@21n/stores/context.store";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { ICollectionItemPropertyValue } from "@21n/components/collection/collection.type";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import view from "@21n/stores/view.store";
  let {
    links = [],
    propertyValues = [],
    isWrapItems = false,
    parentBgIndex = 1,
    isExpandable = false,
    nodeId = undefined,
    isReadOnlyMode = false,
    expand = $bindable(null),
    accessPoint = ResourceAccessPoint.CLIPPER,
    subContext = undefined,
    onClick = undefined,
    onExpansion = undefined,
    onPropertyChange = undefined,
    onUnlink = undefined
  }: {
    links?: IRecordId[];
    propertyValues?: ICollectionItemPropertyValue[];
    isWrapItems?: boolean;
    parentBgIndex?: number;
    isExpandable?: boolean;
    nodeId?: IRecordId | undefined;
    isReadOnlyMode?: boolean;
    expand?: IRecordId | null;
    accessPoint?: ResourceAccessPoint;
    subContext?: "clipper-modal" | undefined;
    onClick?:
      | ((event: CustomEvent<{ item: IRecordId; event: MouseEvent | Event }>) => void)
      | undefined;
    onExpansion?:
      | ((event: CustomEvent<
          | "not-type"
          | "node"
          | "no-props"
          | "has-props"
          | "loading"
          | "error"
          | null
        >) => void)
      | undefined;
    onPropertyChange?: ((event: CustomEvent<any>) => void) | undefined;
    onUnlink?: ((event: CustomEvent<IRecordId>) => void) | undefined;
  } = $props();
  let expansionState = $state<
    | "not-type"
    | "node"
    | "no-props"
    | "has-props"
    | "loading"
    | "error"
  >("loading");
  let types = $state<any[]>([]);
  let link = $state({} as INodeLinkThumb);
  let propertyCount = $state<number | undefined>(undefined);
  const _links = $derived(links?.filter(removeDuplicatesFilter) ?? []);

  $effect(() => {
    if (expand) {
      refreshExpansion(expand);
    }
  });

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
    const expansionEvent = new CustomEvent<
      | "not-type"
      | "node"
      | "no-props"
      | "has-props"
      | "loading"
      | "error"
      | null
    >("expansion", {
      detail: expand ? expansionState : null
    });
    onExpansion?.(expansionEvent);
  }

  function onClickItem(item: IRecordId, e: any) {
    if (isExpandable) {
      expand = expand && isSameResource(expand, item) ? null : item;
      if (expand) refreshExpansion(item);
      propagateExpansionState();
      e.stopPropagation();
    } else {
      const clickEvent = new CustomEvent<{
        item: IRecordId;
        event: MouseEvent | Event;
      }>("click", {
        detail: {
          item,
          event: e
        }
      });
      onClick?.(clickEvent);
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
        onclick={(e) => {
          if (
            $context.isTouchDevice &&
            accessPoint === ResourceAccessPoint.SELF
          )
            return;
          onClickItem(item, e);
        }}
        onGoToResource={(e) => {
          onClickItem(item, e);
        }}
        onRemove={() => {
          if (expand && isSameResource(expand, item)) {
            expand = null;
          }
          const unlinkEvent = new CustomEvent<IRecordId>("unlink", {
            detail: item
          });
          onUnlink?.(unlinkEvent);
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
            onChange={(e) => {
              const propertyChangeEvent = new CustomEvent<any>(
                "propertyChange",
                {
                  detail: e.detail
                }
              );
              onPropertyChange?.(propertyChangeEvent);
            }}
            onPropertyCount={(count) => {
              propertyCount = count;
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
