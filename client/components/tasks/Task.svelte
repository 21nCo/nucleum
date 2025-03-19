<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import { taskStore } from "./task.store";
  import type { ITaskThumb } from "./task.type";

  import TaskThumbnail from "./TaskThumbnail.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { recentsStore } from "../record/recent.store";

  export let id: IRecordId;
  let task: ITaskThumb | undefined = undefined;

  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    const result = await taskStore.selectMany({
      filters: {
        id
      }
    });
    if (isValidArrayWithData(result)) {
      task = result[0];
      recentsStore.add(task, {
        type: Resource.task,
        timestamp: new Date()
      });
    }
  }
</script>

{#if task}
  <div class="my-auto userdata ph-no-capture">
    <TaskThumbnail item={task} accessPoint={ResourceAccessPoint.SELF} />
  </div>
{/if}
