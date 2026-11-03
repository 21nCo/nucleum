<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { resolveFullScreenOverlayPath } from "@nucleum/shell/overlays/full-screen-overlay";

  const ComponentResolver = requireActionRenderer();

  const path = $derived(resolveFullScreenOverlayPath($page.url.searchParams));
</script>

{#if path}
  <div
    class="fixed inset-0 w-full h-full bg-bgs1 z-50"
    data-testid="overlay-layer"
    data-overlay={path}
    data-full-screen="true"
  >
    {#key path}
      <ComponentResolver {path} params={{ isInline: false }} />
    {/key}
  </div>
{/if}
