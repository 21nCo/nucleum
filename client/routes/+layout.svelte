<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import "@nucleum/client/app.css";
  import BaseLayer from "@nucleum/composition/layers/BaseLayer.svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<BaseLayer>
  {@render children?.()}
</BaseLayer>
