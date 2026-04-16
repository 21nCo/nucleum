<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import type { IRecordId } from "@21n/types/data.type";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import { SearchStore } from "@21n/components/record/record.store";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { toasts } from "@21n/stores/notification.store";
  import { ErrorMessage } from "@21n/components/error/error.type";

  let {
    goalId,
    placeholder = "+ add a task",
    onCreateNew = undefined,
    onSelect = undefined,
    onBlur = undefined,
    onFocus = undefined
  }: {
    goalId: IRecordId;
    placeholder?: string;
    onCreateNew?:
      | ((event: CustomEvent<{ label: string; goalId: IRecordId }>) => void)
      | undefined;
    onSelect?: ((event: CustomEvent<any>) => void) | undefined;
    onBlur?: ((event: CustomEvent<void>) => void) | undefined;
    onFocus?: ((event: CustomEvent<void>) => void) | undefined;
  } = $props();
  let label: string = "";
  let inputRef: TextSearchInput;
  const searchStore = new SearchStore(Resource.task);
  export function focus() {
    inputRef.focus();
  }

  async function createNew() {
    if (!label) return;
    const labelCopy = label;
    reset();
    const createNewEvent = new CustomEvent<{ label: string; goalId: IRecordId }>(
      "createNew",
      {
        detail: {
          label: labelCopy,
          goalId
        }
      }
    );
    onCreateNew?.(createNewEvent);
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

  async function handleSelect(event: any) {
    try {
      if (!event.detail.item) return;
      const task = event.detail.item;
      const selectEvent = new CustomEvent("select", { detail: task });
      onSelect?.(selectEvent);
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
    onSelect={handleSelect}
    onEmptyEnter={createNew}
    {onFocus}
    {onBlur}
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
            onclick={createNew}
            size={Size.xs}
            icon="plus"
            tooltip="Add"
            isPreventMinWidth={true}
          />
        {/if}
        <Button
          onclick={reset}
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
