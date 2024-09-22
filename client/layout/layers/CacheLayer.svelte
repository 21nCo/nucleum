<script lang="ts">
  import { flux } from "$lib/client/components/flux/flux";
  import account from "$lib/client/stores/account.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { onDestroy } from "svelte";

  let interval: any;
  interval = setInterval(() => {
    if ($account.dataMode !== UserDataMode.CLOUD) return;
    //TODO - check if network is available
    flux?.sync();
  }, 3500);
  onDestroy(() => {
    clearInterval(interval);
  });
</script>
