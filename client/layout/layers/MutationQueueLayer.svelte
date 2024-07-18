<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import account from "$lib/client/stores/account.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import type { IEvent } from "$lib/client/types/event.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { liveQuery } from "dexie";
  import { onMount } from "svelte";
  let mutationQueue = refreshMutationQueueLiveQuery();
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
  //TODO - Temp - disabling for Pointron release
  // setInterval(() => {
  //   if (isValidArrayWithData($mutationQueue) && $account.isLoggedIn) {
  //     dataManager.syncPendingMutations();
  //     console.log(
  //       "Syncing mutations",
  //       $mutationQueue.map((m) => m.id)
  //     );
  //   }
  // }, 1500);
</script>
