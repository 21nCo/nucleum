<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import TaskLibrary from "../../tasks/TaskLibrary.svelte";

  export let id: IRecordId;
</script>

<TaskLibrary goalId={id} />
