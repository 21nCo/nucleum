<script lang="ts">
  import PointInMap from "$lib/client/components/maps/PointInMap.svelte";
  export let location:
    | {
        latitude?: number;
        longitude?: number;
      }
    | undefined = undefined;
</script>

<PointInMap {location} />
