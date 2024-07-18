<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import RegionSetting from "./RegionSetting.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { InfoTextType } from "$lib/client/types/text.type";
  let region: string = "useast";
  let isBootstrapInProgress: boolean = false;
  let isAlreadyBootstrapped: boolean = false;
  let error: string | undefined = undefined;
  onMount(() => {
    if ($account.userInfo?.isBootstrapped && $account.userInfo?.region) {
      isAlreadyBootstrapped = true;
      region = $account.userInfo?.region;
    }
  });
</script>

<div class="w-full h-full flex justify-center items-center overflow-auto">
  <div
    class="mo:w-full mo:px-4 w-[40rem] h-full flex flex-col mo:gap-10 gap-20 justify-center"
  >
    <div class="flex flex-col gap-2">
      <div class="text-xl text-fgs3">
        Hi {$account.userInfo?.nickName}!
      </div>
      <div class="text-b2 text-fgs3">
        Thanks for taking your time to try <b>
          {properCase($appStore.product)}.
        </b> One last step before you can start using the app.
      </div>
    </div>
    <RegionSetting
      bind:region
      isDisabled={isBootstrapInProgress || isAlreadyBootstrapped}
    />
    {#if isAlreadyBootstrapped}
      <InlineInfoBanner
        type={InfoTextType.ERROR}
        content="**Account setup is complete.** Currently, you cannot change your region once set. If you wish to change your region, please chat with us for assistance or delete your account and create a new one."
        action={{ label: "Chat with us", action: "chat" }}
      />
    {/if}
    <InlineErrorMessage bind:error />
    <div class="flex w-full justify-center">
      {#if isAlreadyBootstrapped}
        <div class="flex gap-2 mo:flex-col">
          <Button
            label="Delete and create new account"
            type={ButtonVariant.DANGER}
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              account.delete();
            }}
          />
          <Button
            label="Go to home"
            type={ButtonVariant.PRIMARY}
            on:click={() => {
              appStore.gotoPath("/");
            }}
          />
        </div>
      {:else}
        <Button
          label="Complete setup"
          isLoading={isBootstrapInProgress}
          type={ButtonVariant.PRIMARY}
          on:click={async () => {
            isBootstrapInProgress = true;
            const result = await account.bootstrap(region);
            if (!result) {
              error = "Something went wrong. Please try again later.";
              return;
            }
            isBootstrapInProgress = false;
          }}
        />
      {/if}
    </div>
  </div>
</div>
