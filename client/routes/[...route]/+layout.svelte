<script lang="ts">
  import AuthGuard from "$lib/client/layout/layers/AuthGuard.svelte";
  import ProductLayer from "$local/LocalBaseLayer.svelte";
</script>

<AuthGuard let:isLoggedIn>
  {#if isLoggedIn}
    <ProductLayer>
      <slot />
    </ProductLayer>
  {/if}
</AuthGuard>
