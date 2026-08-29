<script lang="ts">
  import { datafn } from "@21n/stores/datafn.store";
  import {
    determineResourceType,
    isSameResource,
    resourceInList
  } from "@21n/data/datafn/resource.utils";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { ResourceAccessPoint } from "@21n/data/datafn/resource.type";
  import type {
    ICollectionItem,
    ICollectionItemPropertyValue
  } from "@21n/components/collection/collection.type";
  import type { IRecordId } from "@21n/types/data.type";
  import type {
    IProperty,
    IPropertyValue
  } from "@21n/components/collection/properties/property.type";
  import PropertyItem from "@21n/components/collection/properties/PropertyItem.svelte";

  let {
    item,
    values = [],
    properties = [],
    accessPoint = ResourceAccessPoint.BROWSER
  }: {
    item: ICollectionItem;
    values?: ICollectionItemPropertyValue[];
    properties?: IProperty[];
    accessPoint?: ResourceAccessPoint;
  } = $props();

  async function propagateChanges(
    propertyId: IRecordId,
    value: IPropertyValue | null
  ) {
    values = values?.filter((x) => !isSameResource(x, propertyId)) ?? [];
    const property = {
      id: propertyId,
      value
    };
    values = [...values, property];
    const resourceType = determineResourceType(item.id);
    if (resourceType === Resource.unknown) return;
    await datafn.table(resourceType).mutate({
      operation: "relate",
      id: item.id.toString(),
      relations: {
        propertyValues: [
          {
            $ref: propertyId.toString(),
            fromResource: resourceType.toString(),
            value
          }
        ]
      },
      debounceKey: "property" + propertyId.toString(),
      debounceMs: 1500
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
      {item}
      onChange={(e) => {
        propagateChanges(property.id, e.detail);
      }}
      context={accessPoint === ResourceAccessPoint.COLLECTION
        ? "collectionView"
        : "default"}
    />
  {/each}
</button>
