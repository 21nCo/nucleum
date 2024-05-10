<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { resolveBackgroundClass } from "$lib/tidy/utils/theme.utils";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import Popover from "../popover/Popover.svelte";
  import { formatDate } from "$lib/tidy/utils/time.utils";
  import AbsoluteTimeRangePopover from "./absolute/AbsoluteTimeRangePopover.svelte";
  const dispatch = createEventDispatcher();
  export let parentBackgroundIndex: number = 1;
  export let date: Date;
  export let variant:
    | "wide-v1"
    | "wide"
    | "inline"
    | "icon"
    | "use-time-period-picker" = "wide";
  let popoverRef: any;
  let isPopoverActive: boolean = false;
  let backgroundColor: string;
  let dateInput: HTMLInputElement;
  onMount(() => {
    let colors = resolveBackgroundClass(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
  });
  function updateDate(e: any) {
    const newDate = new Date(e.target.value);
    date = newDate;
    dispatch("change", { date });
  }
</script>

{#if variant == "wide-v1"}
  <label class="block max-w-md w-full rounded-md">
    <input
      type="date"
      on:input={updateDate}
      value={date.toISOString().substr(0, 10)}
      class="mt-1 block w-full {backgroundColor} py-1 px-2 rounded-md"
    />
  </label>
{:else if variant == "wide"}
  <Popover bind:this={popoverRef}>
    <button
      slot="trigger"
      class="flex items-center gap-2 min-w-fit rounded-md bg-bgs2 p-2 w-40 focus:outline focus:outline-aps1"
    >
      <Icon icon="calendar" size={Size.md} />
      <span class="text-fgs2 text-base">
        {formatDate(date)}
      </span>
    </button>
    <slot:fragment slot="popover">
      <AbsoluteTimeRangePopover
        isDatePickerMode={true}
        bind:selectedDate={date}
        on:change={() => {
          popoverRef.toggle();
          dispatch("change", { date });
        }}
      />
    </slot:fragment>
  </Popover>
{:else}
  <div class="relative">
    <input
      bind:this={dateInput}
      bind:value={date}
      on:input={updateDate}
      type="date"
      class="absolute w-full h-full opacity-0 cursor-pointer bg-bgs3"
    />
    <button
      class="flex items-center rounded-md p-2"
      on:click={(e) => {
        console.log("clicked", e, isPopoverActive);
        if (isPopoverActive) {
          dateInput.blur();
          isPopoverActive = false;
        } else {
          dateInput.focus();
          dateInput.click();
          isPopoverActive = true;
        }
      }}
    >
      <Icon icon="calendar" size={variant === "inline" ? Size.md : Size.lg} />
      <!-- {#if variant === "inline"}
        <span class="ml-2 text-fgs2">{formatDate(date)}</span>
      {/if} -->
      <!-- {formatDate(date)} -->
    </button>
  </div>
{/if}

<style>
  input::-webkit-calendar-picker-indicator {
    /* Change the default appearance of the calendar icon */

    background-size: contain;
    background-repeat: no-repeat;
    filter: invert(60%);
  }

  input[type="date"] {
    margin-top: 1px;
  }

  ::-webkit-datetime-edit-text {
    /* Change the font style and color of the date value */
    font-size: 14px;
    font-family: sans-serif;
  }

  ::-webkit-datetime-edit-fields-wrapper {
    /* Change the padding of the date value fields */
    padding: 0.25rem;
  }

  ::-webkit-calendar-picker-popup {
    /* Change the background color and border of the calendar popover */
    background-color: rgba(var(--colors-bgs2));
    border: 1px solid #e5e7eb;
  }
</style>
