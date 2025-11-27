<script lang="ts">
  import { performSessionCheck } from "@21n/components/account/auth";
  import AppLoadingView from "@21n/layout/paint/AppLoadingView.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "../../stores/app.store";
  import { productData } from "@21n/products/product.resolver";
  import AuthGuard from "@21n/layout/layers/AuthGuard.svelte";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { onMount } from "svelte";
  import AccountDebugInfo from "./AccountDebugInfo.svelte";
  let token = "";
  const dev_isDebugAccountMode = false;
  onMount(() => {
    postMessageToParent(EmbedMessage.MOUNT);
    token = localStorage.getItem("embedToken") || "";
  });
</script>

{#await performSessionCheck()}
  <AppLoadingView />
{:then value}
  {#if value}
    {#if dev_isDebugAccountMode}
      <AccountDebugInfo />
    {:else}
      <AuthGuard let:isLoggedIn>
        {#if isLoggedIn}
          <svelte:component this={productData.base}>
            <slot />
          </svelte:component>
        {/if}
      </AuthGuard>
    {/if}
  {:else}
    <div class="h-full flex flex-col justify-center items-center">
      {token}
      <Button
        label="Login/Signup"
        on:click={() => {
          appStore.gotoPath("/account/login");
        }}
      />
    </div>
  {/if}
{:catch error}
  Error: {error}
  <div class="h-full flex flex-col justify-center items-center">
    <Button
      label="Login/Signup"
      on:click={() => {
        appStore.gotoPath("/account/login");
      }}
    />
  </div>
{/await}
