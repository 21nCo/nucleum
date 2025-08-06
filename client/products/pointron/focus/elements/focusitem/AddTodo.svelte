<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ErrorMessage } from "$lib/client/components/error/error.type";
  import { createEventDispatcher } from "svelte";

  export let goalId: IRecordId;
  export let placeholder: string = "+ add a task";
  let label: string = "";
  let inputRef: TextSearchInput;
  const searchStore = new SearchStore(Resource.task);
  const dispatch = createEventDispatcher();

  export function focus() {
    inputRef.focus();
  }

  async function createNew() {
    if (!label) return;
    const labelCopy = label;
    reset();
    dispatch("createNew", {
      label: labelCopy,
      goalId
    });
    // if (goalId) await focusItemsStore.addNewTask(labelCopy, goalId);
  }

  function reset() {
    label = "";
    inputRef?.reset();
  }

  function searchCallback(search: string) {
    return searchStore.select({
      searchQuery: search,
      filters: {
        goalId: goalId.toString(),
        isChecked: false
      },
      isStrictSearch: true
    });
  }

  async function onSelect(event: any) {
    try {
      if (!event.detail.item) return;
      const task = event.detail.item;
      dispatch("select", task);
    } catch (error: any) {
      toasts.error(error.message ?? ErrorMessage.DEFAULT);
    }
  }
</script>

<div class="flex items-center gap-1 w-full pl-3 {goalId ? 'h-12' : 'h-14'}">
  <!-- <div class="flex justify-center items-center">
    <Check isChecked={false} size={Size.sm} />
  </div> -->
  <TextSearchInput
    on:select={onSelect}
    on:empty-enter={createNew}
    on:focus
    on:blur
    bind:value={label}
    bind:this={inputRef}
    {searchCallback}
    style={InputStyle.PLAIN}
    {placeholder}
    icon="plus"
    emptyStateLabel={{
      mainText: "No tasks found.",
      subText: "Press **Enter** to create a new task."
    }}
  />
  <div class=" flex justify-end items-center">
    {#if label}
      <div class="flex gap-2 items-center">
        {#if label}
          <Button
            on:click={createNew}
            size={Size.xs}
            icon="plus"
            tooltip="Add"
            isPreventMinWidth={true}
          />
        {/if}
        <Button
          on:click={reset}
          icon="cross"
          size={Size.xs}
          tooltip="Clear"
          tooltipOptions={{
            placement: Placement.BottomCenter
          }}
        />
      </div>
    {/if}
  </div>
</div>
