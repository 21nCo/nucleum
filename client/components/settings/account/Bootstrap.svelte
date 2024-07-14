<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { properCase } from "$lib/client/utils/text.utils";
  import { onMount } from "svelte";
  import RegionSetting from "./RegionSetting.svelte";
  let region: string = "useast";
  onMount(() => {
    if ($account.userInfo?.isBootstrapped) appStore.gotoPath("/");
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
    <RegionSetting bind:region />
    <div class="flex w-full justify-center">
      <Button
        label="Complete setup"
        type={ButtonVariant.PRIMARY}
        on:click={() => {
          account.bootstrap(region);
          appStore.gotoPath("/onboarding");
        }}
      />
    </div>
  </div>
</div>
