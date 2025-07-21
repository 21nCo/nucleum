<script lang="ts">
  import { flux } from "$lib/client/components/flux/flux";
  import account from "$lib/client/stores/account.store";
  import context from "$lib/client/stores/context.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { onDestroy } from "svelte";
  //TODO - sync on beforeunload as well
  let interval: any;
  interval = setInterval(() => {
    if ($account.dataMode !== UserDataMode.CLOUD || $context.isInOfflineMode)
      return;
    flux?.sync();
  }, 3500);
  onDestroy(() => {
    clearInterval(interval);
  });
</script>
