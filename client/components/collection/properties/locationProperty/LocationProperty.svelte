<script lang="ts">
  import PointInMap from "@21n/components/maps/PointInMap.svelte";
  export let location:
    | {
        latitude?: number;
        longitude?: number;
      }
    | undefined = undefined;
</script>

<PointInMap {location} />
