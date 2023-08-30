<script>
  import Button from "$lib/tidy/elements/Button.svelte";
  import { account } from "$lib/tidy/stores/app.store";
  import AccountForm from "./AccountForm.svelte";
</script>

{#if $account.isLoggedIn}
  <div class="flex flex-col items-center justify-center">
    <div>
      Name: {$account.firstName || ""}
      {$account.lastName || ""}
    </div>
    <div>Email: {$account.email || "NA"}</div>
    <Button
      label="Sign out"
      on:click={() => {
        account.signOut();
      }}
    />
  </div>
{:else}
  <AccountForm />
{/if}
