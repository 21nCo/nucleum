<script lang="ts">
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { formatDatetime } from "@21n/utils/time.utils";
  import {
    type IProperty,
    PropertyType
  } from "@21n/components/collection/properties/property.type";
  import ColorsProperty from "@21n/components/collection/properties/colorsProperty/ColorsProperty.svelte";
  import LocationProperty from "@21n/components/collection/properties/locationProperty/LocationProperty.svelte";
  import type { ICollectionItem } from "@21n/components/collection/collection.type";
  export let property: IProperty;
  export let item: ICollectionItem;

  function resolveFallbackLabel() {
    if (property.type === PropertyType.CREATED_TIME) {
      return "Created";
    } else if (property.type === PropertyType.MODIFIED_TIME) {
      return "Modified";
    } else if (property.type === PropertyType.LOCATION) {
      return "Location";
    }
    return "Unknown";
  }
</script>

<div class="flex flex-col w-full items-start">
  <FormControlLabel
    props={{
      label: property.label ? property.label : resolveFallbackLabel()
    }}
  />
  {#if property.type === PropertyType.CREATED_TIME}
    {formatDatetime($userPreferences, new Date(item?.createdAt))}
  {:else if property.type === PropertyType.MODIFIED_TIME}
    {formatDatetime($userPreferences, new Date(item?.modifiedAt))}
  {:else if property.type === PropertyType.SYSTEM_ID}
    {item.id?.toString()}
  {:else if property.type === PropertyType.LINKS_COUNT}
    <!-- TODO -->
  {:else if property.type === PropertyType.COLORS}
    <ColorsProperty colors={item?.metadata?.colors} />
  {:else if property.type === PropertyType.LOCATION}
    <LocationProperty location={item?.metadata?.location} />
  {/if}
</div>
