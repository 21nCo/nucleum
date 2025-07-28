<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { extractProduct } from "$lib/shared/utils/utils";
  import FeedbackPaneBase from "./FeedbackPaneBase.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let code: number;
  export let isWithoutToolbarContext: boolean = false;

  $: product = extractProduct(window.location.hostname);
  $: isSelfPage = product.product === "memotron";
</script>

<FeedbackPaneBase {isWithoutToolbarContext}>
  <div class="flex flex-col gap-3 h-60 justify-between">
    <div class="flex flex-col items-center">
      <SubAtomLogo subatom="memotron" />
      <div>Memotron</div>
    </div>
    <div class="flex w-full h-full justify-center items-center text-center">
      {#if code === 1}
        Login successful. Please close this page.
      {:else if code === -2}
        Logged out. Please login again to continue
      {:else if code === -3}
        Login not found. Please login to continue
      {:else}
        No Login found. Please login to save to Memotron
      {/if}
    </div>
    {#if code !== 1}
      <div class="flex gap-2 justify-center items-center">
        <Button
          icon="log-in"
          label="Login"
          type={ButtonVariant.PRIMARY}
          on:click
        />
        <Button
          icon="arrow-path"
          label="I'll login later"
          on:click={() => {
            dispatch("later");
          }}
        />
      </div>
    {/if}
  </div>
</FeedbackPaneBase>
