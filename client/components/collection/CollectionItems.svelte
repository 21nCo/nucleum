<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import type { IRecordId } from "@21n/types/data.type";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import NodeRecords from "@21n/products/memotron/node/NodeRecords.svelte";
  import type { ICollectionItem } from "@21n/components/collection/collection.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Records from "@21n/components/record/Records.svelte";

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
