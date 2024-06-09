<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { liveQuery } from "dexie";
  let mutationQueue = liveQuery(() =>
    $dataManager.cacheSource.dexie.mutationQueuev2.toArray()
  );
  setInterval(() => {
    if (isValidArrayWithData($mutationQueue)) {
      dataManager.syncPendingMutations();
      console.log(
        "Syncing mutations",
        $mutationQueue.map((m) => m.id)
      );
    }
  }, 1500);
</script>
