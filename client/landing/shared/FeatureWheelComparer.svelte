<script lang="ts">
  import FeatureWheel from "$lib/client/components/featureWheel/FeatureWheel.svelte";
  import {
    FeatureWheelMode,
    type FeatureWheelGroup
  } from "$lib/client/types/featureWheel.type";
  export let product: string;
  export let features: FeatureWheelGroup[];
</script>

<FeatureWheel
  mode={FeatureWheelMode.COMPARER}
  wheel={{ product, groups: features }}
/>
