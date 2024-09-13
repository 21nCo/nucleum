<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import ProductInfoFooter from "./about/ProductInfoFooter.svelte";
  export let parentBgIndex: number = 1;
</script>

<div class="flex w-full justify-center">
  {#if $account.dataMode === UserDataMode.CLOUD}
    <span class="w-3/5">
      <Button
        isExpandToFullWidth={true}
        icon="logout"
        label="Sign out"
        style={ButtonStyle.OUTLINED}
        {parentBgIndex}
        on:click={() => {
          account.signOut();
        }}
      />
    </span>
  {/if}
</div>
<ProductInfoFooter />
