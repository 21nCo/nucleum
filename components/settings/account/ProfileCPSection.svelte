<script>
  import Button from "$lib/tidy/elements/Button.svelte";
  import {
    account,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { bg } from "$lib/tidy/utils/utils";
</script>

<div
  class="rounded-lg mx-4 p-4 h-40 min-h-[10rem] {bg($userPreferences.theme, 1)}"
>
  {#if $account.isLoggedIn}
    <div class="flex justify-center items-center w-full h-full">
      logged in as {$account?.email ?? "..."}
    </div>
  {:else}
    <div
      class="w-full h-full flex flex-col justify-between text-fgs3 items-center"
    >
      <div class="text-b3 text-center">
        No Account found. Please login/signup to enable cloud sync.
      </div>
      <div class="flex gap-4">
        <Button
          label="login"
          parentBackgroundIndex={2}
          size={Size.sm}
          on:click={() => windowObject.gotoPath("/cp/account?login=true")}
        />
        <Button
          label="signup"
          parentBackgroundIndex={2}
          size={Size.sm}
          on:click={() => windowObject.gotoPath("/cp/account")}
        />
      </div>
    </div>
  {/if}
</div>
