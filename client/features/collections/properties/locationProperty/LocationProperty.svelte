<script lang="ts">
  import PointInMap from "@21n/ui/compositions/maps/PointInMap.svelte";
  import { resolveLocationAddress } from "@nucleum/features/collections/properties/locationProperty/location-address";
  let {
    location = undefined
  }: {
    location?:
      | {
          latitude?: number;
          longitude?: number;
        }
      | undefined;
  } = $props();
</script>

<PointInMap {location} resolveAddress={resolveLocationAddress} />
