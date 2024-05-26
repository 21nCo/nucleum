<script lang="ts">
  import {
    NodeThumbnailVariant,
    type INodeThumbnail
  } from "$lib/client/types/memotron/node.type";
  import NodeThumbnailInGrid from "./NodeThumbnailInGrid.svelte";
  import NodeThumbnailInList from "./NodeThumbnailInList.svelte";
  import NodeThumbnailInTimeline from "./NodeThumbnailInTimeline.svelte";
  export let node: INodeThumbnail;
  export let variant: NodeThumbnailVariant = NodeThumbnailVariant.LIST;
  export let parentBgIndex = 1;
</script>

{#if variant === NodeThumbnailVariant.LIST}
  <NodeThumbnailInList {node} {parentBgIndex} on:click />
{:else if variant === NodeThumbnailVariant.GRID}
  <NodeThumbnailInGrid {node} {parentBgIndex} on:click />
{:else if variant === NodeThumbnailVariant.TIMELINE}
  <NodeThumbnailInTimeline
    {node}
    on:click
    parentBackgrounIndex={parentBgIndex}
  />
{/if}
