<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import account from "$lib/client/stores/account.store";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { liveQuery } from "dexie";
  let mutationQueue = liveQuery(() =>
    $dataManager.cacheSource.dexie.mutationQueuev2.toArray()
  );
  setInterval(() => {
    if (isValidArrayWithData($mutationQueue) && $account.isLoggedIn) {
      dataManager.syncPendingMutations();
      console.log(
        "Syncing mutations",
        $mutationQueue.map((m) => m.id)
      );
    }
  }, 1500);
</script>
