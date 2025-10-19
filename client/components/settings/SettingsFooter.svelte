<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import account from "@21n/stores/account.store";
  import { UserDataMode } from "@21n/types/account.type";
  import { ButtonStyle } from "@21n/types/button.type";
  import ProductInfoFooter from "@21n/components/settings/about/ProductInfoFooter.svelte";
  export let parentBgIndex: number = 1;
</script>

<div class="flex w-full justify-center">
  {#if $account.dataMode === UserDataMode.CLOUD}
    <span class="flex justify-center w-3/5">
      <Button
        icon="log-out"
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
