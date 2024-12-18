<script lang="ts">
  import type { ICollectionView } from "$lib/client/products/memotron/collection/collection.type";
  import type {
    INodePropertyValue,
    INodeThumb
  } from "$lib/client/products/memotron/node/node.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import BoardPane from "./BoardPane.svelte";
  import NodeItems from "../NodeItems.svelte";
  import {
    calculateGroupingCounts,
    resolveOptionsForGrouping,
    UNASSIGNED_VALUE
  } from "../collection.utils";
  import {
    extractResourceIdFromElementId,
    isSameResource,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { nodeStore } from "../../node/node.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IActiveCollectionStore } from "../collection.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    type IPropertyValue,
    PropertyType
  } from "../properties/property.type";

  export let collection: IActiveCollectionStore;
  export let view: ICollectionView;
  export let data: INodeThumb[] = [];
  export let isBoardOverflow = false;

  $: boardCounts = calculateGroupingCounts(data, view.groupBy);
  $: groups = resolveOptionsForGrouping(
    view.groupBy,
    $collection.properties,
    boardCounts,
    { isBoardView: true }
  );

  async function handleDropItem(e: any) {
    const item = e.detail.item;
    if (!item) return;
    const nodeId = extractResourceIdFromElementId(item);
    if (!nodeId) return;
    const node = await nodeStore.select(nodeId);
    if (!node) return;
    let nodePropertyValues: INodePropertyValue[] = [...(node.properties || [])];
    let isChangesPresent = false;
    const currentGroupValue = nodePropertyValues.find(
      (property: INodePropertyValue) =>
        isSameResource(property.id, view.groupBy)
    )?.value;
    const currentSubGroupValue = nodePropertyValues.find(
      (property: INodePropertyValue) =>
        isSameResource(property.id, view.subGroupBy)
    )?.value;

    const groupValueChange = assignValueIfApplicable(
      currentGroupValue,
      e.detail.group,
      nodePropertyValues,
      view.groupBy
    );
    if (groupValueChange) {
      nodePropertyValues = groupValueChange;
      isChangesPresent = true;
    }
    const subGroupValueChange = assignValueIfApplicable(
      currentSubGroupValue,
      e.detail.subGroup,
      nodePropertyValues,
      view.subGroupBy
    );
    if (subGroupValueChange) {
      nodePropertyValues = subGroupValueChange;
      isChangesPresent = true;
    }

    if (!isChangesPresent) return;
    const result = await nodeStore.modify(nodeId, {
      properties: nodePropertyValues
    });
    data = data.map((node: INodeThumb) => {
      if (isSameResource(node.id.toString(), nodeId)) {
        return {
          ...node,
          properties: nodePropertyValues
        };
      }
      return node;
    });

    function assignValueIfApplicable(
      currentValue: IPropertyValue | null | undefined,
      newValue: string,
      nodePropValues: INodePropertyValue[],
      propertyId: IRecordId
    ) {
      if (!propertyId || !newValue) return;

      const propertyConfig = $collection.properties?.find(
        resourceInList(propertyId)
      );
      if (!currentValue || typeof currentValue === "string") {
        if (newValue && currentValue !== newValue) {
          nodePropValues = nodePropValues.filter(
            (property: INodePropertyValue) =>
              !isSameResource(property.id, propertyId)
          );
          nodePropValues.push({
            id: propertyId,
            value:
              propertyConfig?.type === PropertyType.MULTI_SELECT
                ? [newValue]
                : newValue
          });
          return nodePropValues;
        }
      } else if (Array.isArray(currentValue)) {
        if (newValue && !currentValue.includes(newValue)) {
          nodePropValues = nodePropValues.filter(
            (property: INodePropertyValue) =>
              !isSameResource(property.id, propertyId)
          );
          const newValToBeAssigned =
            newValue === UNASSIGNED_VALUE
              ? []
              : propertyConfig?.type === PropertyType.MULTI_SELECT
                ? [...currentValue, newValue]
                : newValue;
          nodePropValues.push({
            id: propertyId,
            value: newValToBeAssigned
          });
          return nodePropValues;
        }
      }
    }
  }
</script>

{#if isValidArrayWithData(groups)}
  <div class="w-full h-full flex overflow-x-auto overflow-y-hidden gap-4">
    {#each groups as group}
      <BoardPane
        {collection}
        {view}
        {group}
        {isBoardOverflow}
        {data}
        on:dropItem={handleDropItem}
      />
    {/each}
  </div>
{:else}
  <NodeItems
    nodes={data}
    arrangement={view.arrangement}
    density={view.density}
    isHidePreview={view.isHideThumbnailPreview}
    isHideTitle={view.isHideThumbnailTitle}
    isDraggable={false}
    accessPoint={ResourceAccessPoint.COLLECTION}
    accessPointId={collection.id}
    visibleProps={$collection.properties?.filter((x) =>
      view.properties?.some(resourceInList(x))
    )}
  />
  <ScrollViewBottomSpacer />
{/if}
