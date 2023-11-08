<script lang="ts">
  import { account, windowObject } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import AccountForm from "../settings/account/AccountForm.svelte";
  $: if ($account.isLoggedIn) {
    windowObject.gotoPath("/");
  }
  onMount(() => {
    const sub = account.subscribe((value) => {
      if (value.isLoggedIn) {
        windowObject.gotoPath("/");
      }
    });
    return () => {
      sub;
    };
  });
</script>

<div class="flex flex-col justify-center items-center gap-8 w-full h-full">
  <!-- todo - add logo -->
  <div class="font-medium">Your session has expired. Please login again.</div>
  <AccountForm />
</div>
