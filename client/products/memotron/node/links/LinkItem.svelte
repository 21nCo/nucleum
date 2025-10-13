<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import type {
    INode,
    INodeLinkThumb
  } from "$lib/client/products/memotron/node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import LinkTagger from "../../linking/LinkTagger.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import LinkTags from "../../linking/LinkTags.svelte";
  import NodeThumbnail from "../thumbnail/NodeThumbnail.svelte";
  import LinkTypeIndicator from "./LinkTypeIndicator.svelte";
  import { LinkType } from "$lib/client/products/memotron/linking/link.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let accessPointId: IRecordId;
  export let link: INodeLinkThumb;
  export let item: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
  export let accessPointContext: string | undefined = undefined;
  let isShowLinkTagger = false;

  function propagateLinkTypeClick(
    linkType: LinkType,
    direction: "incoming" | "outgoing"
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
        "pt-3": (link.tags && link.tags.length > 0) || isShowLinkTagger
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
          <LinkTagger bind:link />
        </div>
      {/if}
    </span>
  </NodeThumbnail>
</button>
