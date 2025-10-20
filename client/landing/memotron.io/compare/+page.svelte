<script lang="ts">
  import {
    features,
    categories,
    contemporaries
  } from "@21n/landing/memotron.io/compare/memotronWheel";
  import FeatureWheelComparer from "@21n/landing/shared/FeatureWheelComparer.svelte";
</script>

<FeatureWheelComparer
  product="memotron"
  title="Memotron wholesome wheel"
  {features}
  {categories}
  {contemporaries}
/>
