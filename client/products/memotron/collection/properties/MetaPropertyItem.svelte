<script lang="ts">
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import {
    type IProperty,
    PropertyType
  } from "../../collection/properties/property.type";
  import LocationCard from "../../node/metadata/LocationCard.svelte";
  import { resolveActiveNodeStore } from "../../node/node.store";
  export let config: IProperty;
  export let nodeId: string;
  const node = resolveActiveNodeStore(nodeId);
</script>

<div class="flex flex-col w-full items-start">
  <FormControlLabel
    props={{
      label: config.label
    }}
  />
  {#if config.type === PropertyType.CREATED_TIME}
    {formatDatetime($userPreferences, new Date($node?.createdAt))}
  {:else if config.type === PropertyType.MODIFIED_TIME}
    {formatDatetime($userPreferences, new Date($node?.modifiedAt))}
  {:else if config.type === PropertyType.LOCATION}
    <LocationCard metadata={$node?.metadata} />
  {/if}
</div>
