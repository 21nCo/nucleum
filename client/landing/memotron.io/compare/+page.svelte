<script lang="ts">
  import {
    features,
    categories,
    contemporaries
  } from "$lib/client/landing/memotron.io/compare/memotronWheel";
  import FeatureWheelComparer from "../../shared/FeatureWheelComparer.svelte";
</script>

<FeatureWheelComparer
  product="memotron"
  title="Memotron comparision wheel"
  {features}
  {categories}
  {contemporaries}
/>
