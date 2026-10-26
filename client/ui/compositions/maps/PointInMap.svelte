<script lang="ts">
  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import { mapTileStyles } from "@21n/ui/compositions/maps/map.styles";
  import { mount } from "@21n/ui/actions/mount.action";
  let {
    location = undefined,
    resolveAddress = undefined
  }: {
    location?:
    | {
        latitude?: number;
        longitude?: number;
      }
    | undefined;
    resolveAddress?:
      | ((location: {
          latitude: number;
          longitude: number;
        }) => Promise<string | undefined>)
      | undefined;
  } = $props();
  let address = $state<string | undefined>(undefined);
  const mapContainerId = generateSimpleRandomId();

  async function load() {
    if (!location?.latitude || !location?.longitude) return;
    new maplibregl.Map({
      container: mapContainerId,
      style: mapTileStyles.osm as any,
      center: [location?.longitude, location?.latitude],
      zoom: 5
    });

    address = await resolveAddress?.({
      latitude: location.latitude,
      longitude: location.longitude
    });
  }
</script>

<div class="flex flex-col w-full">
  <div
    id={mapContainerId}
    class="w-full h-40 rounded-t-md"
    use:mount={load}
  ></div>
  <span class="w-full flex p-2 rounded-b-md text-b2 text-fgs2">
    {address ?? ""}
  </span>
</div>
