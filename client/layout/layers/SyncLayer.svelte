<script lang="ts">
  import { flux } from "@21n/components/flux/flux";
  import account from "@21n/stores/account.store";
  import context from "@21n/stores/context.store";
  import { UserDataMode } from "@21n/types/account.type";
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
