<script lang="ts">
  import AuthGuard from "@21n/layout/layers/AuthGuard.svelte";
  import { productData } from "@21n/products/product.resolver";
</script>

<AuthGuard let:isLoggedIn>
  {#if isLoggedIn}
    <svelte:component this={productData.base}>
      <slot />
    </svelte:component>
  {/if}
</AuthGuard>
