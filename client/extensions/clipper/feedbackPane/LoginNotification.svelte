<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { extractProduct } from "$lib/shared/utils/utils";
  import FeedbackPaneBase from "./FeedbackPaneBase.svelte";
  export let code: number;
  $: product = extractProduct(window.location.hostname);
  $: isSelfPage = product.product === "memotron";
  $: isOAuthPage =
    window.location.hostname.includes("accounts.google.com") ||
    window.location.hostname.includes("appleid.apple.com");
  $: isLoginInProgress =
    (isSelfPage &&
      (window.location.pathname.includes("signup") ||
        window.location.pathname.includes("oauth"))) ||
    isOAuthPage;
  $: console.log({ product, isSelfPage, isLoginInProgress, code });
</script>

<FeedbackPaneBase>
  <div class="flex flex-col gap-3 h-40 justify-between">
    {#if code === 1 || code === -2 || isLoginInProgress}
      <div class="flex w-full h-full justify-center items-center text-center">
        {#if code === 1}
          Login successful. Please close this page.
        {:else if code === -2}
          Logged out. Please login again to continue
        {:else if isLoginInProgress}
          Logging in progress...
        {/if}
      </div>
    {:else}
      <div class="flex w-full justify-center items-center text-center">
        No Login found. Please login to save to Memotron
      </div>
      <div class="flex justify-center">
        <Button
          icon="arrow-right"
          label="Login"
          type={ButtonVariant.PRIMARY}
          on:click
        />
      </div>
    {/if}
  </div>
</FeedbackPaneBase>
