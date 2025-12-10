<script lang="ts">
  import { vTrail } from "../topNav/tabs/tabs.store";
  import ResourceResolver from "@21n/layout/paint/ResourceResolver.svelte";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  $: parts = $vTrail.activated?.split("-") ?? [];
</script>

<div class="w-full h-full">
  <ResourceResolver
    id={parts[parts.length - 1]}
    accessMode={ResourceAccessMode.INLINE}
  />
</div>
