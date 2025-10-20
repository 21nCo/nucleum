<script lang="ts">
  import { cn, bg } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import type { Dayjs } from "dayjs";

  export let parentBgIndex: number = 0;
  export let isActive: boolean = false;
  export let selectedDate: Dayjs | null = null;
  export let label: string;
  export let onInputChange: (value: string) => void;
  export let onClear: (event: MouseEvent) => void;
  export let onBoxClick: (event: MouseEvent) => void;

  $: selectedDateFormatted = selectedDate?.format("YYYY-MM-DD") || "";
  $: inputValue = selectedDateFormatted;

  function handleClick(e: MouseEvent) {
    inputValue = selectedDate?.format("YYYY-MM-DD") || "";
    if (!isActive) {
      isActive = true;
    }
    onBoxClick(e);
  }

  function handleBlur() {
    isActive = false;
    inputValue = selectedDate?.format("YYYY-MM-DD") || "";
  }

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    inputValue = value;
    onInputChange(value);
    if (!isActive) {
      isActive = true;
    }
  }

  function handleClear(e: MouseEvent) {
    inputValue = "";
    isActive = true;
    onClear(e);
  }
</script>

<div class="flex flex-col items-start gap-1 flex-1">
  <div class="text-b2">{label}</div>
  <button
    class={cn(
      "w-full text-b2 text-fgs3 px-2 py-1 rounded-md cursor-pointer flex items-center justify-between",
      {
        [bg(parentBgIndex + 1)]: true,
        "ring-2 ring-aps1": isActive
      }
    )}
    on:click={handleClick}
  >
    {#if selectedDate && !isActive}
      <span class="truncate">{selectedDate.format("YYYY-MM-DD")}</span>
    {:else}
      <input
        type="text"
        class="bg-transparent outline-none w-full"
        placeholder="yyyy-mm-dd"
        bind:value={inputValue}
        on:input={handleInput}
        on:blur={handleBlur}
      />
    {/if}
    {#if selectedDate}
      <button
        class="flex-shrink-0 p-1 flex items-center justify-center hover:bg-bgs3 rounded-md"
      >
        <Icon
          icon="x-circle"
          size={Size.xs}
          class="stroke-ars1"
          on:click={handleClear}
        />
      </button>
    {/if}
  </button>
</div>
