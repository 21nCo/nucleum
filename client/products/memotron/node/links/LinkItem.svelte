<script lang="ts">
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  import type {
    INode,
    INodeLinkThumb,
    INodeThumb
  } from "@21n/products/memotron/node/node.type";
  import type { IRecordId } from "@21n/types/data.type";
  import LinkTagger from "@21n/products/memotron/linking/LinkTagger.svelte";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import LinkTags from "@21n/products/memotron/linking/LinkTags.svelte";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import LinkTypeIndicator from "./LinkTypeIndicator.svelte";
  import { LinkType } from "@21n/products/memotron/linking/link.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let accessPointId: IRecordId;
  export let link: INodeLinkThumb;
  export let item: INode | INodeThumb;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
  export let accessPointContext: string | undefined = undefined;
  let isShowLinkTagger = false;

  function propagateLinkTypeClick(
    linkType: LinkType,
    direction: "incoming" | "outgoing" | undefined
  ) {
    return (e: Event) => {
      e.stopPropagation();
      dispatch("linkTypeSelect", { linkType, direction });
    };
  }
</script>

<!-- TODO - add parent breadcrumbs  and avatar in below component - moving from LinkSuggestionItem.svelte -->

<button on:click>
  <NodeThumbnail
    {item}
    {accessPoint}
    {accessPointId}
    {accessPointContext}
    on:action
    isAlwaysShowContextMenuOnTouchDevice={true}
  >
    <span slot="right" class="flex items-center gap-2">
      <span class="flex bg-bgs2 rounded-md border border-brs3">
        <Toggle icon="relation" bind:on={isShowLinkTagger} />
      </span>
    </span>
    <span
      slot="bottom"
      class={cn("flex flex-col gap-2", {
        "pt-3":
          (link.tags && link.tags.length > 0) ||
          (link.links && link.links.length > 0) ||
          isShowLinkTagger
      })}
    >
      <span class="flex gap-2">
        {#if link.links && link.links.length > 0}
          <span class="flex gap-1">
            {#each link.links as linkType}
              <LinkTypeIndicator
                linkType={linkType.linkType}
                direction={linkType.direction}
                on:click={propagateLinkTypeClick(
                  linkType.linkType,
                  linkType.direction
                )}
              />
            {/each}
          </span>
        {/if}
        {#if link.tags && link.tags.length > 0}
          <LinkTags bind:link on:tagClick />
        {/if}
      </span>
      {#if isShowLinkTagger}
        <div class="w-full py-2">
          <LinkTagger bind:link on:tag />
        </div>
      {/if}
    </span>
  </NodeThumbnail>
</button>
