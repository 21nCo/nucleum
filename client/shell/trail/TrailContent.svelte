<script lang="ts">
  import { vTrail } from "../topNav/tabs/tabs.store";
  import ResourceResolver from "@nucleum/shell/paint/ResourceResolver.svelte";
  const parts = $derived($vTrail.activated?.split("-") ?? []);
  const lastPartId = $derived(
    parts.length > 0 ? parts[parts.length - 1] : undefined
  );
</script>

{#if lastPartId}
  <div class="w-full h-full">
    <ResourceResolver id={lastPartId} />
  </div>
{/if}
