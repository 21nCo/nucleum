<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  let taskName: string = "";

  export function reset() {
    taskName = "";
  }

  function addTask() {
    dispatch("add", taskName);
  }
</script>

<div>
  <TextInput
    placeholder="Add a task"
    icon="ph:plus"
    isShowSaveControl={taskName !== ""}
    bind:value={taskName}
    on:cancel={() => {
      taskName = "";
    }}
    on:enter={() => addTask()}
    on:save={() => addTask()}
  />
</div>
