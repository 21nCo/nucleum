<script lang="ts">
  import { focusItemsStore } from "$lib/client/products/pointron/focus/session.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Check from "$lib/client/icons/Check.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  export let taskId: IRecordId;
  export let placeholder: string = "+ add a task";
  let label: string = "";
  let inputRef: any;

  export function focus() {
    inputRef.focus();
  }

  async function save() {
    if (!label) return;
    const labelCopy = label;
    reset();
    if (taskId) await focusItemsStore.addTodo(labelCopy, taskId);
  }

  function reset() {
    label = "";
  }
</script>

<div class="flex items-center gap-2 w-full px-4 {taskId ? 'h-12' : 'h-14'}">
  <div class="flex justify-center items-center">
    <Check isChecked={false} size={Size.sm} />
  </div>
  <TextInput
    on:enter={save}
    on:focus
    on:blur
    bind:value={label}
    bind:this={inputRef}
    style={InputStyle.PLAIN}
    {placeholder}
  />
  <div class=" flex justify-end items-center">
    {#if label}
      <div class="flex gap-2">
        {#if label}
          <Button
            on:click={save}
            size={Size.xs}
            label="⮐ add"
            isPreventMinWidth={true}
          />
        {/if}
        <Button
          on:click={reset}
          icon="cross"
          tooltip="Clear"
          tooltipOptions={{
            placement: Placement.Left
          }}
        />
      </div>
    {/if}
  </div>
</div>
