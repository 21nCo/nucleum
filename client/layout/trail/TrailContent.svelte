<script lang="ts">
  import { vTrail } from "../topNav/tabs/tabs.store";
  import ResourceResolver from "@21n/layout/paint/ResourceResolver.svelte";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  $: parts = $vTrail.activated?.split("-") ?? [];
  $: lastPartId = parts.length > 0 ? parts[parts.length - 1] : undefined;
</script>

{#if lastPartId}
  <div class="w-full h-full">
    <ResourceResolver id={lastPartId} accessMode={AccessMode.INLINE} />
  </div>
{/if}
