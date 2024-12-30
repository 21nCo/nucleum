<script lang="ts">
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import {
    type IProperty,
    PropertyType
  } from "../../collection/properties/property.type";
  import LocationCard from "../../node/metadata/LocationCard.svelte";
  import { ActiveNodeStore } from "../../node/node.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import ColorsProperty from "./colorsProperty/ColorsProperty.svelte";
  export let property: IProperty;
  export let nodeId: IRecordId;
  const node = ActiveNodeStore.resolve(nodeId);

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
    {formatDatetime($userPreferences, new Date($node?.createdAt))}
  {:else if property.type === PropertyType.MODIFIED_TIME}
    {formatDatetime($userPreferences, new Date($node?.modifiedAt))}
  {:else if property.type === PropertyType.SYSTEM_ID}
    {nodeId}
  {:else if property.type === PropertyType.LINKS_COUNT}
    <!-- TODO -->
  {:else if property.type === PropertyType.COLORS}
    <ColorsProperty colors={$node?.metadata?.colors} />
  {:else if property.type === PropertyType.LOCATION}
    <LocationCard metadata={$node?.metadata} />
  {/if}
</div>
