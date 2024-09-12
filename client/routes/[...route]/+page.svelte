<script lang="ts">
  import AuthGuard from "$lib/client/layout/layers/AuthGuard.svelte";
  import ProductLayer from "$local/LocalBaseLayer.svelte";
  import PagePainterV2 from "$lib/client/layout/paint/PagePainterV2.svelte";
</script>

<AuthGuard let:isLoggedIn>
  {#if isLoggedIn}
    <ProductLayer>
      <PagePainterV2 />
    </ProductLayer>
  {/if}
</AuthGuard>
