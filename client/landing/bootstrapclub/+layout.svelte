<script lang="ts">
  import type { Snippet } from "svelte";
  import LandingBaseLayer from "@21n/landing/LandingBaseLayer.svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<LandingBaseLayer>
  {@render children?.()}
</LandingBaseLayer>
