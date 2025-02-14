<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { SubTasksMethod, type ITask } from "../task.type";
  import { createEventDispatcher } from "svelte";
  export let subTask: ITask | { label?: string; type: string };
  export let index: number;
  export let totalLength: number;
  export let method: SubTasksMethod = SubTasksMethod.DEFAULT;
  let newSubTaskLabel = "";
  const dispatch = createEventDispatcher();

  function onSave() {
    dispatch("add", { label: newSubTaskLabel });
    newSubTaskLabel = "";
  }
</script>

{#if method === SubTasksMethod.STEPS}
  <button
    class={cn(
      "flex group items-center gap-4 relative border border-transparent rounded-md p-1",
      {
        "hover:border-aps2 hover:bg-aps3": subTask.label
      }
    )}
    on:click
  >
    <div class="flex flex-col items-center relative z-10">
      <div
        class={cn(
          "w-8 h-8 rounded-full bg-bgs2 text-fgs3 text-b2 flex items-center justify-center border border-brs3",
          {
            "group-hover:bg-aps2 group-hover:border-aps1 group-hover:text-aps1":
              subTask.label
          }
        )}
      >
        {#if subTask.type === "add"}
          <Icon icon="ph:plus-light" class="text-fgs3" size={Size.sm} />
        {:else}
          {index + 1}
        {/if}
      </div>
      {#if index !== totalLength - 1}
        <div
          class="w-0.5 h-12 bg-bgs2 absolute top-8 left-4 -translate-x-1/2"
        />
      {/if}
    </div>
    {#if subTask.label}
      <div class="text-left flex-1 py-1.5 group-hover:text-aps1">
        {subTask.label}
      </div>
    {:else}
      <TextInput
        bind:value={newSubTaskLabel}
        placeholder="Add a subtask"
        style={InputStyle.PLAIN}
        isShowSaveControl={newSubTaskLabel !== ""}
        on:enter={onSave}
        on:save={onSave}
      />
    {/if}
  </button>
{:else}
  <button
    class="flex items-center group gap-4 p-2 border border-transparent hover:border-aps2 rounded-md"
    on:click
  >
    {#if subTask.label}
      <div class="text-left flex-1 group-hover:text-aps1">
        {subTask.label}
      </div>
    {:else}
      <TextInput
        bind:value={newSubTaskLabel}
        placeholder="Add a subtask"
        style={InputStyle.PLAIN}
        isShowSaveControl={newSubTaskLabel !== ""}
        on:enter={onSave}
        on:save={onSave}
      />
    {/if}
  </button>
{/if}
