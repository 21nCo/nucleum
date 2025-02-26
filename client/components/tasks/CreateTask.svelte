<script lang="ts">
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { ResourceActionType } from "../flux/resourceStores/resource.type";
  import { resourceAction } from "../flux/resourceStores/resource.utils";
  import modalEvent from "../modal/modal.store";
  import ModalFooter from "../modal/ModalFooter.svelte";
  import { taskStore } from "./task.store";
  const action = resourceAction(Resource.task, ResourceActionType.CREATE);
  let label = "";
  let date: Date | undefined = undefined;
  let inputRef: TextInput | undefined;
  async function handleCreate() {
    return taskStore.save({
      label,
      date,
      isChecked: false
    });
  }

  async function handleCreateOnEnter() {
    await handleCreate();
    modalEvent.hide(action);
  }
</script>

<div class="w-96 h-40 flex flex-col justify-between gap-2">
  <div class="flex items-center gap-2">
    <TextInput
      bind:value={label}
      bind:this={inputRef}
      size={Size.lg}
      on:mount={() => {
        inputRef?.focus();
      }}
      placeholder="Enter task name"
      style={InputStyle.PLAIN}
      on:enter={handleCreateOnEnter}
    />
    <span class="flex items-center gap-1 whitespace-nowrap">
      <DatePicker
        bind:date
        style={InputStyle.PLAIN}
        variant={date ? "inline-with-icon" : "icon-only"}
      />
    </span>
  </div>
  <ModalFooter
    {action}
    primaryAction={{
      label: "Create task",
      icon: "ph:floppy-disk-light",
      size: Size.sm,
      callback: handleCreate
    }}
    secondaryAction={{
      label: "Cancel",
      size: Size.sm,
      icon: "ph:x-light"
    }}
  />
</div>
