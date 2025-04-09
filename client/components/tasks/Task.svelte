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
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";

  export let id: IRecordId;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let isRefreshing = false;
  let task: ITaskThumb | undefined = undefined;

  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    isRefreshing = true;
    const result = await taskStore.selectMany(
      {
        filters: {
          id: id?.toString()
        }
      },
      {
        isExpand: true
      }
    );
    if (isValidArrayWithData(result)) {
      task = result[0];
      recentsStore.add(task, {
        type: Resource.task,
        timestamp: new Date()
      });
    }
    isRefreshing = false;
  }
</script>

{#if isRefreshing}
  <div class="w-80 h-20">
    <EmptyStatusView isLoadingState={isRefreshing} />
  </div>
{:else if task}
  <div class="my-auto userdata ph-no-capture">
    <TaskThumbnail item={task} {accessPoint} />
  </div>
{/if}
