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
    <span class="flex justify-center w-3/5">
      <Button
        icon="ph:sign-out-light"
        label="Sign out"
        style={ButtonStyle.OUTLINED}
        {parentBgIndex}
        on:click={async () => {
          await account.signOut();
        }}
      />
    </span>
  {/if}
</div>
<ProductInfoFooter />
