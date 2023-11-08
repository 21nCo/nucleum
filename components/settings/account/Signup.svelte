<script lang="ts">
  import { account, appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import AccountForm from "./AccountForm.svelte";
  onMount(() => {
    const sub = account.subscribe((value) => {
      if (value.isLoggedIn) {
        windowObject.gotoPath("/");
      }
    });
    return () => {
      sub();
    };
  });
</script>

<div class="w-full h-full flex flex-col gap-4 justify-center items-center">
  <!-- todo - add logo -->
  <div class="font-medium text-h3">
    {$appStore.appData.name}
  </div>
  <div>
    <AccountForm isSignup={true} />
  </div>
</div>
