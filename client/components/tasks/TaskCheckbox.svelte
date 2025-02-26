<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { taskStore } from "./task.store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let isChecked = false;
  export let id: IRecordId;

  function onToggle() {
    taskStore.toggle(id);
    dispatch("toggle", id);
  }
</script>

<input
  class="w-4 h-4"
  type="checkbox"
  bind:checked={isChecked}
  on:change={onToggle}
/>
