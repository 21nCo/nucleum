<script lang="ts">
  import type {
    FeatureWheelMode,
    FeatureWheel
  } from "$lib/client/types/featureWheel.type";
  import FwTrial3 from "./FWTrial3.svelte";
  export let mode: FeatureWheelMode;
  export let wheel: FeatureWheel;
</script>

<FwTrial3 {mode} {wheel} />
