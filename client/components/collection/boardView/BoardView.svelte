<script lang="ts">
  import type {
    ICollectionItem,
    ICollectionItemPropertyValue,
    ICollectionView
  } from "@21n/components/collection/collection.type";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import BoardPane from "@21n/components/collection/boardView/BoardPane.svelte";
  import CollectionItems from "@21n/components/collection/CollectionItems.svelte";
  import {
    calculateGroupingCounts,
    resolveOptionsForGrouping,
    UNASSIGNED_VALUE
  } from "@21n/components/collection/collection.utils";
  import {
    extractResourceIdFromElementId,
    isSameResource,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { IActiveCollectionStore } from "@21n/components/collection/collection.store";
  import type { IRecordId } from "@21n/types/data.type";
  import {
    type IPropertyValue,
    PropertyType
  } from "@21n/components/collection/properties/property.type";

  export let collection: IActiveCollectionStore;
  export let view: ICollectionView;
  export let data: ICollectionItem[] = [];
  export let isBoardOverflow = false;

  $: boardCounts = calculateGroupingCounts(data, view.groupBy);
  $: groups = resolveOptionsForGrouping(
    view.groupBy,
    $collection.properties,
    boardCounts,
    { isBoardView: true }
  );

  async function handleDropItem(e: any) {
    const itemParam = e.detail.item;
    if (!itemParam) return;
    const itemId = extractResourceIdFromElementId(itemParam);
    if (!itemId) return;
    const item = await collection.selectItem(itemId);
    if (!item) return;
    let itemPropertyValues: ICollectionItemPropertyValue[] = [
      ...(item.properties || [])
    ];
    let isChangesPresent = false;
    const currentGroupValue = itemPropertyValues.find(
      (property: ICollectionItemPropertyValue) =>
        isSameResource(property.id, view.groupBy)
    )?.value;
    const currentSubGroupValue = itemPropertyValues.find(
      (property: ICollectionItemPropertyValue) =>
        isSameResource(property.id, view.subGroupBy)
    )?.value;

    const groupValueChange = assignValueIfApplicable(
      currentGroupValue,
      e.detail.group,
      itemPropertyValues,
      view.groupBy
    );
    if (groupValueChange) {
      itemPropertyValues = groupValueChange;
      isChangesPresent = true;
    }
    const subGroupValueChange = assignValueIfApplicable(
      currentSubGroupValue,
      e.detail.subGroup,
      itemPropertyValues,
      view.subGroupBy
    );
    if (subGroupValueChange) {
      itemPropertyValues = subGroupValueChange;
      isChangesPresent = true;
    }

    if (!isChangesPresent) return;
    const result = await nodeStore.modify(itemId, {
      properties: itemPropertyValues
    });
    data = data.map((node: ICollectionItem) => {
      if (isSameResource(node.id.toString(), itemId)) {
        return {
          ...node,
          properties: itemPropertyValues
        };
      }
      return node;
    });

    function assignValueIfApplicable(
      currentValue: IPropertyValue | null | undefined,
      newValue: string,
      nodePropValues: ICollectionItemPropertyValue[],
      propertyId: IRecordId
    ) {
      if (!propertyId || !newValue) return;

      const propertyConfig = $collection.properties?.find(
        resourceInList(propertyId)
      );
      if (!currentValue || typeof currentValue === "string") {
        if (newValue && currentValue !== newValue) {
          nodePropValues = nodePropValues.filter(
            (property: ICollectionItemPropertyValue) =>
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
            (property: ICollectionItemPropertyValue) =>
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
  <CollectionItems
    resource={$collection.resource}
    items={data}
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
