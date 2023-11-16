<script>
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { account } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import AccountForm from "./AccountForm.svelte";
  let firstName = "";
  let lastName = "";
  let email = "";
  onMount(() => {
    account.subscribe((value) => {
      if (value.isLoggedIn) {
        firstName = value.userInfo?.firstName || "";
        lastName = value.userInfo?.lastName || "";
        email = value.userInfo?.email || "";
      }
    });
  });
  function onUpdateClicked() {}
</script>

{#if $account.isLoggedIn}
  <div class="flex flex-col gap-12 items-center justify-center">
    <div class="flex flex-col gap-4 w-96 px-4">
      <!-- <TextInput bind:value={firstName} label="First name" placeholder="John" />
      <TextInput bind:value={lastName} label="Last name" placeholder="Legend" /> -->
      <!-- <TextInput
        bind:value={email}
        label="Email address"
        placeholder="john@legend.com"
      /> -->
      <div>
        <div>First name</div>
        <div class="text-b2 text-fgs3">{firstName}</div>
      </div>
      <div>
        <div>Last name</div>
        <div class="text-b2 text-fgs3">{lastName}</div>
      </div>
      <div>
        <div>Email address</div>
        <div class="text-b2 text-fgs3">{email}</div>
      </div>
    </div>
    <div class="flex justify-center w-full gap-4">
      <Button label="Update" on:click={onUpdateClicked} />
      <Button
        label="Sign out"
        on:click={() => {
          account.signOut();
        }}
      />
    </div>
  </div>
{:else}
  <AccountForm />
{/if}
