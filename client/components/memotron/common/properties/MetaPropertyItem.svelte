<script lang="ts">
  import {
    PropertyType,
    type IProperty
  } from "$lib/client/types/memotron/type.type";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { resolveActiveNodeStore } from "../../node/node.store";
  import { lookupAddressFromLatLong } from "./property.utils";
  export let config: IProperty;
  export let nodeId: string;
  let address: string;
  const node = resolveActiveNodeStore(nodeId);
  $: if (config.type === PropertyType.LOCATION && $node) {
    lookupAddressFromLatLong(
      $node.metadata?.location?.latitude,
      $node.metadata?.location?.longitude
    ).then((res) => {
      console.log({ res });
      if (res?.results?.length > 0) {
        address = res.results.find((x: any) =>
          x.types.includes("locality")
        )?.formatted_address;
      }
    });
  }
</script>

<div class="flex flex-col">
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
    <span>{address ?? ""}</span>
  {/if}
</div>
