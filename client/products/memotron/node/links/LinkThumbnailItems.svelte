<script lang="ts">
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type {
    INode,
    INodeLinkThumb
  } from "@21n/products/memotron/node/node.type";
  import type { IRecordId } from "@21n/types/data.type";
  import LinkItem from "@21n/products/memotron/node/links/LinkItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let links: { link: INodeLinkThumb; node: INode }[];
  export let accessPointId: IRecordId;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
  export let accessPointContext: string | undefined = undefined;
</script>

<div class="flex flex-col gap-3 w-full">
  {#each links as item (item.link.linkedTo)}
    <LinkItem
      link={item.link}
      item={item.node}
      {accessPointId}
      {accessPoint}
      {accessPointContext}
      on:click={(e) => {
        dispatch("click", { event: e, id: item.node.id });
      }}
      on:linkTypeSelect
      on:action
      on:tagClick
      on:tag
    />
  {/each}
</div>
