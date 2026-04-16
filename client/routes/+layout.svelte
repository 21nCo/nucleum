<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import "@21n/client/app.css";
  import BaseLayer from "@21n/layout/layers/BaseLayer.svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<BaseLayer>
  {@render children?.()}
</BaseLayer>
