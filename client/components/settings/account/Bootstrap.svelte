<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { properCase } from "$lib/client/utils/text.utils";
  import { onMount } from "svelte";
  import RegionSetting from "./RegionSetting.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  let region: string = "useast";
  let isBootstrapInProgress: boolean = false;
  let isAlreadyBootstrapped: boolean = false;
  onMount(() => {
    if ($account.userInfo?.isBootstrapped) {
      isAlreadyBootstrapped = true;
    }
  });
</script>

<div class="w-full h-full flex justify-center items-center">
  <div
    class="mo:w-full mo:px-4 w-[40rem] h-full flex flex-col gap-20 justify-center"
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
    {#if isAlreadyBootstrapped}
      <InlineInfoBanner
        content="Account setup already completed. You cannot change your region once set at the moment. Please contact us if you need to change your region."
      />
    {/if}
    <RegionSetting bind:region />
    <div class="flex w-full justify-center">
      <Button
        label="Complete setup"
        isLoading={isBootstrapInProgress}
        type={ButtonVariant.PRIMARY}
        on:click={async () => {
          isBootstrapInProgress = true;
          const result = await account.bootstrap(region);
          //TODO - show error message on failure
          if (!result) return;
          isBootstrapInProgress = false;
          appStore.gotoPath("/onboarding");
        }}
      />
    </div>
  </div>
</div>
