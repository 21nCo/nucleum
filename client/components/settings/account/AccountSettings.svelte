<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { onMount } from "svelte";
  import {
    frameEmailFromParts,
    isValidString
  } from "$lib/shared/utils/text.utils";
  import {
    UserDataMode,
    type EmailParts
  } from "$lib/client/types/account.type";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  let nickName = "";
  let emailParts: EmailParts | undefined = undefined;
  onMount(() => {
    account.subscribe((value) => {
      if (value.dataMode === UserDataMode.CLOUD) {
        nickName = value.userInfo?.nickName || "";
        emailParts = value.userInfo?.emailParts || undefined;
      }
    });
  });
  function onUpdateClicked() {}
</script>

<div class="flex flex-col w-full h-full gap-12 items-start overflow-y-auto">
  <div
    class="flex flex-col gap-1 w-full justify-center rounded-md bg-bgs2 p-4 text-left"
  >
    <div>Hi {nickName ?? ""}!</div>
    <div class="flex flex-col gap-2 text-fgs3 text-b2">
      Thanks for being one of the early users of our app! 🥳
      <div>
        We are working on stability improvements and releasing updates almost
        everyday. Please support us as we build the best possible digital memory
        tool together!
      </div>
      <div>
        To maintain our commitment to privacy and ensure long-term
        sustainability, we will be rolling out paid cloud sync plan soon. We
        promise to keep it as low as possible ({`<`} $10 per month). As an early
        member, you will receive a 50% discount on cloud sync plan for your first
        year after your trial ends.
      </div>
    </div>
    <div class="text-fgs3 text-b3 mt-4">-Team Memotron</div>
  </div>
  <div class="flex flex-col items-start gap-4 w-80 tp:w-96 py-4">
    <Text content="Account Details" style={TextStyle.SECTION_HEADING} />
    <div class="flex flex-col items-start">
      <div>Name</div>
      <div class="text-b2 text-fgs3">
        {isValidString(nickName) ? nickName : "Unknown"}
      </div>
    </div>
    {#if emailParts}
      <div class="flex flex-col items-start">
        <div>Email address</div>
        <div class="text-b2 text-fgs3">{frameEmailFromParts(emailParts)}</div>
      </div>
    {/if}
  </div>
  <div class="flex justify-center w-full gap-4">
    <Button
      icon="logout"
      label="Sign out"
      on:click={async () => {
        await account.signOut();
      }}
    />
    <Button
      icon="trash"
      label="Delete account"
      type={ButtonVariant.DANGER}
      on:click={async () => {
        await account.delete();
      }}
    />
  </div>
  <ScrollViewBottomSpacer />
</div>
