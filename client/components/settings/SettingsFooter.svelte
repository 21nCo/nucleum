<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import ProductInfoFooter from "./about/ProductInfoFooter.svelte";
  export let parentBgIndex: number = 1;
</script>

<div class="flex w-full justify-center">
  <Button
    width="w-2/5"
    icon="logout"
    label="Sign out"
    {parentBgIndex}
    on:click={() => {
      account.signOut();
    }}
  />
</div>
<ProductInfoFooter />
