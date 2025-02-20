<script lang="ts">
  import { cn, bg } from "$lib/client/utils/ui.utils";
  import Icon from "../../Icon.svelte";
  import { Size } from "../../../types/size.enum";
  import type { Dayjs } from "dayjs";

  export let parentBgIndex: number = 0;
  export let isSelected: boolean = false;
  export let selectedDate: Dayjs | null = null;
  export let dateInput: string = "";
  export let label: string;
  export let onInputChange: (value: string) => void;
  export let onClear: (event: MouseEvent) => void;
  export let onBoxClick: (event: MouseEvent) => void;

  let isEditing = false;
  let internalDateInput = "";

  $: if (!isEditing) {
    internalDateInput = dateInput;
  }

  function handleClick(e: MouseEvent) {
    isEditing = true;
    if (selectedDate) {
      internalDateInput = selectedDate.format("YYYY-MM-DD");
      onInputChange(internalDateInput);
    }
    onBoxClick(e);
  }

  function handleBlur() {
    isEditing = false;
  }

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    internalDateInput = value;
    onInputChange(value);
  }
</script>

<div class="flex flex-col items-start gap-1 flex-1">
  <div class="text-b2">{label}</div>
  <button
    class={cn(
      "w-full text-b2 text-fgs3 px-2 py-1 rounded-md cursor-pointer flex items-center justify-between",
      {
        [bg(parentBgIndex + 1)]: true,
        "ring-2 ring-aps1": isSelected
      }
    )}
    on:click={handleClick}
  >
    {#if selectedDate && !isEditing}
      <span class="truncate">{selectedDate.format("YYYY-MM-DD")}</span>
    {:else}
      <input
        type="text"
        class="bg-transparent outline-none w-full"
        placeholder="yyyy-mm-dd"
        bind:value={internalDateInput}
        on:input={handleInput}
        on:blur={handleBlur}
      />
    {/if}
    {#if selectedDate}
      <button
        class="flex-shrink-0 p-1 flex items-center justify-center hover:bg-bgs3 rounded-md"
      >
        <Icon
          icon="ph:x-circle"
          size={Size.xs}
          class="stroke-ars1"
          on:click={onClear}
        />
      </button>
    {/if}
  </button>
</div>
