<script lang="ts">
  import type { ICollectionView } from "$lib/client/products/memotron/collection/collection.type";
  import type {
    INodePropertyValue,
    INodeThumb
  } from "$lib/client/products/memotron/node/node.type";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import BoardPane from "./BoardPane.svelte";
  import NodeItems from "../NodeItems.svelte";
  import type { IProperty } from "../properties/property.type";
  import { resolvePropertyOptions } from "../properties/property.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    isNoneResource,
    isSameResource,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { nodeStore } from "../../node/node.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IActiveCollectionStore } from "../collection.store";

  export let collection: IActiveCollectionStore;
  export let view: ICollectionView;
  export let data: INodeThumb[] = [];
  export let isBoardOverflow = false;

  $: groups = resolveBoards(view.groupBy, $collection.properties);

  function resolveBoards(id: IRecordId, properties: IProperty[]) {
    // if (view.groups) return view.groups;
    if (isNoneResource(id) || !properties?.find(resourceInList(id))) return [];
    return [
      {
        label: "Unassigned",
        value: "unassigned"
      },
      ...resolvePropertyOptions(id, properties, { isBoardView: true })
    ];
  }

  async function handleDropItem(e: any) {
    const nodeId = e.detail.item;
    if (!nodeId) return;
    const node = await nodeStore.select(nodeId);
    if (!node) return;
    let nodePropertyValues: INodePropertyValue[] = [...(node.properties || [])];
    let isGroupChanged = false;
    let isSubGroupChanged = false;
    const currentGroupValue = nodePropertyValues.find(
      (property: INodePropertyValue) =>
        isSameResource(property.id, view.groupBy)
    )?.value;
    const currentSubGroupValue = nodePropertyValues.find(
      (property: INodePropertyValue) =>
        isSameResource(property.id, view.subGroupBy)
    )?.value;
    if (e.detail.group && currentGroupValue !== e.detail.group) {
      isGroupChanged = true;
      nodePropertyValues = nodePropertyValues.filter(
        (property: INodePropertyValue) =>
          !isSameResource(property.id, view.groupBy)
      );
      nodePropertyValues.push({
        id: view.groupBy,
        value: e.detail.group
      });
    }
    if (e.detail.subGroup && currentSubGroupValue !== e.detail.subGroup) {
      isSubGroupChanged = true;
      nodePropertyValues = nodePropertyValues.filter(
        (property: INodePropertyValue) =>
          !isSameResource(property.id, view.subGroupBy)
      );
      nodePropertyValues.push({
        id: view.subGroupBy,
        value: e.detail.subGroup
      });
    }
    if (!isGroupChanged && !isSubGroupChanged) return;
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
    isDraggable={false}
    accessPoint={ResourceAccessPoint.COLLECTION}
    accessPointId={collection.id}
  />
  <ScrollViewBottomSpacer />
{/if}
