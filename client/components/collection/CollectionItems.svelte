<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IProperty } from "./properties/property.type";
  import NodeRecords from "$lib/client/products/memotron/node/NodeRecords.svelte";
  import type { ICollectionItem } from "./collection.type";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import Records from "../record/Records.svelte";

  export let items: ICollectionItem[] = [];
  export let resource: Resource | undefined = undefined;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let density = 1;
  export let isHidePreview: boolean = false;
  export let isHideTitle: boolean = false;
  export let parentBgIndex = 1;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let accessPointId: IRecordId | undefined = undefined;
  export let accessPoint: ResourceAccessPoint | undefined = undefined;
  export let visibleProps: IProperty[] = [];

  $: isMasonryAvailable = !resource || [Resource.node].includes(resource);
</script>

<!-- TODO - other collectible items -->
{#if isMasonryAvailable}
  <NodeRecords
    nodes={items}
    {arrangement}
    {isHidePreview}
    {isHideTitle}
    {density}
    {isDraggable}
    {accessPointId}
    {accessPoint}
    {isApplyCustomColor}
    {visibleProps}
    {parentBgIndex}
  />
{:else}
  <Records {resource} data={items} {arrangement} />
{/if}
