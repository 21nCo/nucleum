<script lang="ts">
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import {
    isSameResource,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import type { IRecordId } from "@21n/types/data.type";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import PropertyItem from "@21n/components/collection/properties/PropertyItem.svelte";
  import {
    ActiveNodeStore,
    nodeStore
  } from "@21n/products/memotron/node/node.store";
  import type { INodePropertyValue } from "@21n/products/memotron/node/node.type";
  let {
    values = [],
    properties = [],
    accessPoint = ResourceAccessPoint.BROWSER,
    nodeId
  }: {
    values?: INodePropertyValue[];
    properties?: IProperty[];
    accessPoint?: ResourceAccessPoint;
    nodeId: IRecordId;
  } = $props();
  let node = ActiveNodeStore.resolve(nodeId);
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

<button
  class="flex gap-3 flex-wrap items-center userdata"
  onclick={(event) => event.stopPropagation()}
>
  {#each properties as property (property.id)}
    <PropertyItem
      value={values?.find(resourceInList(property))?.value}
      {property}
      item={$node}
      onChange={(e) => {
        propagateChanges(property.id, e.detail);
      }}
      context={accessPoint === ResourceAccessPoint.COLLECTION
        ? "collectionView"
        : "default"}
    />
  {/each}
</button>
