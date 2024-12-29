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
  export let accessPointId: IRecordId;
  export let link: INodeLinkThumb;
  export let item: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
  export let accessPointContext: string | undefined = undefined;
  let isShowLinkTagger = false;
</script>

<!-- TODO - add parent breadcrumbs  and avatar in below component - moving from LinkSuggestionItem.svelte -->

<button on:click>
  <NodeThumbnail
    {item}
    {accessPoint}
    {accessPointId}
    {accessPointContext}
    on:action
  >
    <span slot="right" class="flex bg-bgs2 rounded-md border border-brs3">
      <Toggle icon="ph:tag-light" bind:on={isShowLinkTagger} />
    </span>
    <span
      slot="bottom"
      class={cn("flex flex-col gap-2", {
        "pt-2": (link.tags && link.tags.length > 0) || isShowLinkTagger
      })}
    >
      {#if link.tags && link.tags.length > 0}
        <LinkTags bind:link on:tagClick />
      {/if}
      {#if isShowLinkTagger}
        <div class="w-full py-2">
          <LinkTagger bind:link />
        </div>
      {/if}
    </span>
  </NodeThumbnail>
</button>
