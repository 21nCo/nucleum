<script lang="ts">
  import { flux } from "$lib/client/components/flux/flux";
  import account from "$lib/client/stores/account.store";
  import context from "$lib/client/stores/context.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { onDestroy } from "svelte";
  let interval: any;
  interval = setInterval(() => {
    proceedSync();
  }, 3500);

  onDestroy(() => {
    clearInterval(interval);
  });

  function proceedSync() {
    if ($account.dataMode !== UserDataMode.CLOUD || $context.isInOfflineMode)
      return;
    flux?.sync();
  }
</script>

<svelte:window
  on:beforeunload={() => {
    proceedSync();
  }}
/>
