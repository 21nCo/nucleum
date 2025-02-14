<script lang="ts">
  import { SubTasksMethod } from "../task.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  export let subTasksMethod: SubTasksMethod;
</script>

<div class="text-fgs3">
  <DropDown
    bind:value={subTasksMethod}
    popoverWidth="w-32"
    style={InputStyle.PLAIN}
    isDisableSearch={true}
    items={[
      {
        value: SubTasksMethod.DEFAULT,
        icon: "ph:circle-dashed-light",
        label: "Default"
      },
      {
        value: SubTasksMethod.STEPS,
        icon: "ph:list-numbers-light",
        label: "Steps"
      }
      // {
      //   value: SubTasksMethod.TREE,
      //   icon: "ph:tree-view-light",
      //   label: "Tree"
      // }
    ]}
    on:select
  />
</div>
