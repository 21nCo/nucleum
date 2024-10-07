<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type {
    INode,
    INodeLinkThumb
  } from "$lib/client/products/memotron/node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import LinkItem from "./LinkItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let links: { link: INodeLinkThumb; node: INode }[];
  export let accessPointId: IRecordId;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
</script>

<div class="flex flex-col gap-3 w-full">
  {#each links as item}
    <LinkItem
      link={item.link}
      item={item.node}
      {accessPointId}
      {accessPoint}
      on:click={(e) => {
        dispatch("click", { event: e, id: item.node.id });
      }}
      on:action
      on:tagClick
    />
  {/each}
</div>
