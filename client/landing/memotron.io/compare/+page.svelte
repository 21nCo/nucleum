<script lang="ts">
  import { memotronWheel } from "$lib/client/landing/memotron.io/compare/memotronWheel";
  import FeatureWheelComparer from "../../shared/FeatureWheelComparer.svelte";
</script>

<FeatureWheelComparer product="memotron" features={memotronWheel} />
