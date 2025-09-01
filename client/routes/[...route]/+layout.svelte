<script lang="ts">
  import AuthGuard from "$lib/client/layout/layers/AuthGuard.svelte";
  import { productData } from "$lib/client/products/product.resolver";
</script>

<AuthGuard let:isLoggedIn>
  {#if isLoggedIn}
    <svelte:component this={productData.base}>
      <slot />
    </svelte:component>
  {/if}
</AuthGuard>
