<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<div data-testid="context-zone-inline-stub">
  {@render children()}
</div>
