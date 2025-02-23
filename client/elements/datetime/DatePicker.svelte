<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import InputBaseElement from "../InputBaseElement.svelte";
  import AbsoluteTimeRangePopover from "./absolute/AbsoluteTimeRangePopover.svelte";
  import FormElement from "../FormElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { popover } from "$lib/client/actions/popover.action";
  import AbsoluteTimeRangePopoverV2 from "./absolute/AbsoluteTimeRangePopoverV2.svelte";
  const dispatch = createEventDispatcher();
  export let parentBackgroundIndex: number = 1;
  export let date: Date | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let variant:
    | "wide"
    | "wide-center"
    | "inline"
    | "icon"
    | "use-time-period-picker" = "wide";
  let ref: any;
  /**
   * @deprecated
   */
  let isPopoverActive: boolean = false;
  let isPopoverVisible: boolean = false;
  let dateInput: HTMLInputElement;
  let _date: Date = date ?? new Date();
  function updateDate(e: any) {
    const newDate = new Date(e.target.value);
    date = newDate;
    _date = newDate;
    dispatch("change", date);
  }

  function hidePopover() {
    ref?.dispatchEvent(new CustomEvent("hide"));
  }
</script>

{#if variant == "wide" || variant == "wide-center"}
  <!-- <InputBaseElement
    class="gap-2 min-w-fit {variant === 'wide-center'
      ? 'justify-center'
      : 'justify-start'}"
    {style}
    {label}
    isFocused={isPopoverVisible}
    popoverOptions={{
      isSpanToTriggerWidth: false,
      parentBgIndex: parentBackgroundIndex
    }}
  >
    <Icon icon="calendar" size={Size.md} />
    {#if date}
      <span class="text-fgs2 text-base">
        {formatDate(date)}
      </span>
    {:else}
      <span class="text-fgs2 text-b2">Select a date</span>
    {/if}
    <slot:fragment slot="popover">
      <AbsoluteTimeRangePopover
        isDatePickerMode={true}
        bind:selectedDate={_date}
        on:change={() => {
          // popoverRef?.toggle();
          date = _date;
          dispatch("change", _date);
        }}
      />
    </slot:fragment>
  </InputBaseElement> -->

  <FormElement {style} {label} isFocused={isPopoverVisible}>
    <div
      class={cn("flex items-center gap-2 p-2 w-full", {
        "justify-center": variant == "wide-center",
        "justify-start": variant == "wide"
      })}
      bind:this={ref}
      use:popover={{
        content: AbsoluteTimeRangePopoverV2,
        id: "date-picker-popover",
        isRenderAsModalForCW: true,
        componentProps: {
          isDatePickerMode: true,
          selectedDate: _date,
          onDateChange: (val) => {
            date = val;
            _date = val;
            dispatch("change", val);
            hidePopover();
          }
        }
      }}
      on:change={(e) => {
        isPopoverVisible = e.detail?.open;
      }}
    >
      <Icon icon="calendar" size={Size.md} />
      {#if date}
        <span class="text-fgs2 text-base">
          {formatDate(date)}
        </span>
      {:else}
        <span class="text-fgs2 text-b2">Select a date</span>
      {/if}
    </div>
  </FormElement>
{:else if variant == "inline"}
  <div
    class="relative"
    use:popover={{
      content: AbsoluteTimeRangePopoverV2,
      id: "date-picker-popover",
      isRenderAsModalForCW: true,
      componentProps: {
        isDatePickerMode: true,
        selectedDate: _date,
        onDateChange: (val) => {
          date = val;
          _date = val;
          dispatch("change", val);
          hidePopover();
        }
      }
    }}
  >
    {formatDate(date)}
  </div>
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
