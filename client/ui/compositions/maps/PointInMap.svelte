<script lang="ts">
  import { createMaplibreMap } from "@21n/ui/compositions/maps/maplibre";
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
    const { latitude, longitude } = location;
    resolveAddress?.({ latitude, longitude }).then((resolvedAddress) => {
      address = resolvedAddress;
    });
    try {
      await createMaplibreMap({
        container: mapContainerId,
        style: mapTileStyles.osm as any,
        center: [longitude, latitude],
        zoom: 5
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }
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
