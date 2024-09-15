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

<div class="flex flex-col w-full gap-12 items-start justify-center">
  <div class="flex flex-col items-start gap-4 w-80 tp:w-96 px-4">
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
</div>
