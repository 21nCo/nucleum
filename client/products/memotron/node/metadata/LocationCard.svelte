<script lang="ts">
  import { onMount } from "svelte";
  import type { INodeMetadata } from "../node.type";
  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { Persistence } from "$lib/client/persistence/persistence";
  import account from "$lib/client/stores/account.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import context from "$lib/client/stores/context.store";
  export let metadata: INodeMetadata;
  let address: string;
  let mapContainerId: string = generateSimpleRandomId();

  onMount(async () => {
    if (!metadata?.location?.latitude || !metadata?.location?.longitude) return;
    new maplibregl.Map({
      container: mapContainerId,
      style: "https://demotiles.maplibre.org/style.json",
      center: [metadata?.location?.longitude, metadata?.location?.latitude],
      zoom: 2
    });

    if ($account.dataMode === UserDataMode.LOCAL || $context.isInOfflineMode)
      return;
    const res = await new Persistence().runGeoAction(
      "lookupAddressFromLatLong",
      {
        lat: metadata.location.latitude,
        long: metadata.location.longitude
      }
    );
    if (res?.results?.length > 0) {
      address = res.results.find((x: any) =>
        x.types.includes("locality")
      )?.formatted_address;
    }
  });
</script>

<div class="flex flex-col w-full">
  <div id={mapContainerId} class="w-full h-40 rounded-t-md"></div>
  <span class="w-full flex p-2 rounded-b-md">
    {address ?? ""}
  </span>
</div>
