<script lang="ts">
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import { resourceInList } from "../../flux/resourceStores/resource.utils";
  import NestedList from "../../nestedList/NestedList.svelte";
  import { NestedListStyle } from "../../nestedList/nestedList.type";
  import { taskStore, type IActiveTaskStore } from "../task.store";
  import { SubTasksMethod } from "../task.type";
  import SubTaskItem from "./SubTaskItem.svelte";
  import SubTasksMethodSwitcher from "./SubTasksMethodSwitcher.svelte";
  export let task: IActiveTaskStore;
  $: _subTasks = [
    ...($task.subTasks || []),
    $task.subTasksMethod !== SubTasksMethod.DEFAULT && {
      label: undefined,
      type: "add"
    }
  ];

  function onSubTaskClick(id: IRecordId) {
    appStore.openResource(id, ResourceAccessMode.POP, {
      replaceId: $task.id
    });
  }

  async function onAddSubTask(e: any) {
    const result = await taskStore.addSubTaskWithContext(
      [...($task.parent || []), $task.id],
      {
        label: e.detail.label
      },
      $task.subTasks?.map((t) => t.id)
    );
    if (result && Array.isArray(result)) {
      const newTask = result[0];
      $task.subTasks = [...($task.subTasks || []), newTask];
    }
  }
  async function onAddSubTaskFromNestedList(e: any) {
    const result = await taskStore.addSubTask(e.detail.id, {
      label: e.detail.label
    });
  }

  async function resolveSubTasks(id: IRecordId) {
    const result = await taskStore.select(id);
    console.log;
    if (result) return result.subTasks;
    else return [];
  }
  async function resolveContent(id: IRecordId) {
    const item = _subTasks.find(resourceInList(id));
    if (item) return item;
    const result = await taskStore.select(id);
    if (result) return result;
    else return "";
  }
</script>

{#if $task.subTasks}
  <div class="flex items-center justify-end gap-2 w-full">
    <SubTasksMethodSwitcher bind:subTasksMethod={$task.subTasksMethod} />
  </div>
  <div
    class={cn("flex flex-col p-4", {
      "gap-6": $task.subTasksMethod === SubTasksMethod.STEPS,
      "gap-2": $task.subTasksMethod === SubTasksMethod.DEFAULT
    })}
  >
    {#if !$task.subTasksMethod || $task.subTasksMethod === SubTasksMethod.DEFAULT}
      <NestedList
        items={_subTasks.map((t) => t.id)}
        contentCallback={resolveContent}
        childrenCallback={resolveSubTasks}
        style={NestedListStyle.OUTLINED}
        isShowAddTextInput={true}
        on:click={(e) => {
          if (e.detail) {
            onSubTaskClick(e.detail);
          }
        }}
        on:add={onAddSubTask}
        on:addSub={onAddSubTaskFromNestedList}
        addPlaceholder="Add new subtask"
      />
    {:else}
      {#each _subTasks as subTask, index (subTask.id || subTask.type)}
        <SubTaskItem
          {subTask}
          {index}
          totalLength={_subTasks.length}
          method={$task.subTasksMethod}
          on:click={() => {
            onSubTaskClick(subTask.id);
          }}
          on:add={onAddSubTask}
        />
      {/each}
    {/if}
  </div>
{/if}
