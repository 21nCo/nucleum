<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { SearchStore } from "../../record/record.store";
  import type { ITaskThumb } from "../../tasks/task.type";
  import { isValidArray } from "$lib/shared/utils/obj.utils";
  import TasksLibrary from "../../tasks/TasksLibrary.svelte";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";

  export let id: IRecordId;
  let tasks: ITaskThumb[] = [];
  let searchStore = new SearchStore(Resource.task);

  onMount(() => {
    refresh();
  });

  async function refresh() {
    const result = await searchStore.select({
      filters: {
        goal: id.toString()
      }
    });
    if (isValidArray(result)) {
      tasks = [...result];
    } else {
      tasks = [];
    }
  }
</script>

<TasksLibrary
  data={tasks}
  accessPoint={ResourceAccessPoint.GOAL}
  accessPointId={id}
/>
