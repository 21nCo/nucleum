<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { account } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import { frameEmailFromParts } from "$lib/tidy/utils/text.utils";
  import type { EmailParts } from "$lib/tidy/types/account.type";
  import { ButtonVariant } from "$lib/tidy/types/button.type";
  let nickName = "";
  let emailParts: EmailParts | undefined = undefined;
  onMount(() => {
    account.subscribe((value) => {
      if (value.isLoggedIn) {
        nickName = value.userInfo?.nickName || "";
        emailParts = value.userInfo?.emailParts || undefined;
      }
    });
  });
  function onUpdateClicked() {}
</script>

<div class="flex flex-col w-full gap-12 items-center justify-center">
  <div class="flex flex-col gap-4 w-80 md:w-96 px-4">
    <!-- <TextInput bind:value={firstName} label="First name" placeholder="John" />
      <TextInput bind:value={lastName} label="Last name" placeholder="Legend" /> -->
    <!-- <TextInput
        bind:value={email}
        label="Email address"
        placeholder="john@legend.com"
      /> -->
    <div>
      <div>Name</div>
      <div class="text-b2 text-fgs3">{nickName}</div>
    </div>
    {#if emailParts}
      <div>
        <div>Email address</div>
        <div class="text-b2 text-fgs3">{frameEmailFromParts(emailParts)}</div>
      </div>
    {/if}
  </div>
  <div class="flex justify-center w-full gap-4">
    <!-- <Button label="Update" on:click={onUpdateClicked} /> -->
    <Button
      icon="logout"
      label="Sign out"
      on:click={() => {
        account.signOut();
      }}
    />
    <Button
      icon="trash"
      label="Delete account"
      type={ButtonVariant.DANGER}
      on:click={() => {
        account.delete();
      }}
    />
  </div>
</div>
