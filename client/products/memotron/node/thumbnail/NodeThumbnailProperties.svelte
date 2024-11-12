<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    isSameResource,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type { IProperty } from "../../collection/properties/property.type";
  import { resolvePropertyDefaultValue } from "../../collection/properties/property.utils";
  import PropertyItem from "../../collection/properties/PropertyItem.svelte";
  import { nodeStore } from "../node.store";
  import type { INodePropertyValue } from "../node.type";
  export let values: INodePropertyValue[] = [];
  export let properties: IProperty[] = [];
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let nodeId: IRecordId;
  async function propagateChanges(id: IRecordId, value: any) {
    values = values?.filter((x) => !isSameResource(x, id)) ?? [];
    const newValue = {
      id,
      value
    };
    values = [...values, newValue];
    nodeStore.modify(nodeId, {
      properties: values
    });
  }
</script>

<button class="flex gap-3 flex-wrap items-center" on:click|stopPropagation>
  {#each properties as property (property.id)}
    <PropertyItem
      value={values?.find(resourceInList(property))?.value ??
        resolvePropertyDefaultValue(property)}
      {property}
      {nodeId}
      on:change={(e) => {
        propagateChanges(property.id, e.detail);
      }}
      on:newOption
      on:configChange
      context={accessPoint === ResourceAccessPoint.COLLECTION
        ? "collectionView"
        : "default"}
    />
  {/each}
</button>
