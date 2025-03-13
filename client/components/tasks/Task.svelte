<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import { taskStore } from "./task.store";
  import type { ITaskThumb } from "./task.type";

  import TaskThumbnail from "./TaskThumbnail.svelte";
  export let id: IRecordId;
  let task: ITaskThumb | undefined = undefined;

  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    task = await taskStore.select(id);
  }
</script>

{#if task}
  <div class="my-auto">
    <TaskThumbnail item={task} accessPoint={ResourceAccessPoint.SELF} />
  </div>
{/if}
