<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import type { IRecordId } from "@21n/types/data.type";
  import { ResourceAccessPoint } from "@21n/data/datafn/resource.type";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import NodeRecords from "@21n/products/memotron/node/NodeRecords.svelte";
  import type { ICollectionItem } from "@21n/components/collection/collection.type";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import Records from "@21n/components/record/Records.svelte";

  let {
    items = [],
    resource = undefined,
    arrangement = Arrangement.LIST,
    density = 1,
    isHidePreview = false,
    isHideTitle = false,
    parentBgIndex = 1,
    isApplyCustomColor = false,
    isDraggable = false,
    accessPointId = undefined,
    accessPoint = undefined,
    visibleProps = []
  }: {
    items?: ICollectionItem[];
    resource?: Resource | undefined;
    arrangement?: Arrangement;
    density?: number;
    isHidePreview?: boolean;
    isHideTitle?: boolean;
    parentBgIndex?: number;
    isApplyCustomColor?: boolean;
    isDraggable?: boolean;
    accessPointId?: IRecordId | undefined;
    accessPoint?: ResourceAccessPoint | undefined;
    visibleProps?: IProperty[];
  } = $props();

  let isMasonryAvailable = $derived(
    !resource || [Resource.node].includes(resource)
  );

  function resolveNodeItems() {
    return items as unknown as INodeThumb[];
  }
</script>

{#if isMasonryAvailable}
  <NodeRecords
    nodes={resolveNodeItems()}
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
  <Records
    {resource}
    data={items}
    {arrangement}
    {accessPoint}
    {visibleProps}
  />
{/if}
