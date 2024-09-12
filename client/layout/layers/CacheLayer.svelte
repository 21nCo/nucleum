<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { flux } from "$lib/client/components/flux/flux";
  import account from "$lib/client/stores/account.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { UserSessionType } from "$lib/client/types/account.type";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import type { IEvent } from "$lib/client/types/event.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { liveQuery } from "dexie";
  import { onDestroy, onMount } from "svelte";
  let mutationQueue = refreshMutationQueueLiveQuery();
  let interval: any;
  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      if (
        x.event === GlobalEvent.BOOTSTRAP ||
        x.event === GlobalEvent.USER_LOGIN
      ) {
        mutationQueue = refreshMutationQueueLiveQuery();
      }
    });
    return () => {
      appEventSub();
    };
  });
  function refreshMutationQueueLiveQuery() {
    return liveQuery(() =>
      $dataManager.cacheSource.dexie.mutationQueuev2.toArray()
    );
  }
  interval = setInterval(() => {
    if ($account.sessionType !== UserSessionType.CLOUD) return;
    if (isValidArrayWithData($mutationQueue)) {
      dataManager.syncPendingMutations();
      // console.log(
      //   "Syncing mutations",
      //   $mutationQueue.map((m) => m.id)
      // );
    }
    //TODO - check if network is available
    // flux.sync();
  }, 3500);
  onDestroy(() => {
    clearInterval(interval);
  });
</script>
