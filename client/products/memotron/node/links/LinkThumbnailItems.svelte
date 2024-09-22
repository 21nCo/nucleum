<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { INode } from "$lib/client/products/memotron/node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import LinkItem from "./LinkItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let links: INode[];
  export let accessPointId: IRecordId;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.NODE_LINKS;
</script>

<div class="flex flex-col gap-2 w-full">
  {#each links as item}
    <LinkItem
      {item}
      {accessPointId}
      {accessPoint}
      on:click={(e) => {
        dispatch("click", { event: e, id: item.id });
      }}
      on:action
    />
  {/each}
</div>
