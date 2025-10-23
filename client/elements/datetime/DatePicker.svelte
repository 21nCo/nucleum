<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import AbsoluteTimeRangePopover from "@21n/elements/datetime/absolute/AbsoluteTimeRangePopover.svelte";
  import FormElement from "@21n/elements/FormElement.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { popover } from "@21n/actions/popover.action";
  import AbsoluteTimeRangePopoverV2 from "@21n/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  import view from "@21n/stores/view.store";
  const dispatch = createEventDispatcher();
  export let parentBackgroundIndex: number = 1;
  export let date: Date | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let placeholder: string = "Select a date";
  export let variant:
    | "wide"
    | "wide-center"
    | "inline"
    | "icon-only"
    | "inline-with-icon"
    | "use-time-period-picker" = "wide";
  export let id: string = "";
  export let size: Size.sm | Size.md | Size.lg = Size.md;
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

  <FormElement
    {style}
    {label}
    isFocused={isPopoverVisible}
    parentBgIndex={parentBackgroundIndex}
  >
    <button
      class={cn("flex items-center gap-2 p-2 w-full default-typeface", {
        "justify-center": variant == "wide-center",
        "justify-start": variant == "wide"
      })}
      bind:this={ref}
      use:popover={{
        content: AbsoluteTimeRangePopoverV2,
        id: "date-picker-popover" + id,
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
        if (isPopoverVisible) {
          dispatch("opened");
        } else {
          dispatch("closed");
        }
      }}
    >
      <Icon icon="calendar" size={Size.md} />
      {#if date}
        <span class="text-fgs2 text-base">
          {parseAndFormatDate(date)}
        </span>
      {:else}
        <span class="text-fgs2 text-b2">{placeholder}</span>
      {/if}
    </button>
  </FormElement>
{:else if variant == "inline" || variant == "icon-only" || variant === "inline-with-icon"}
  <button
    class={cn(
      "relative flex items-center gap-1 justify-center default-typeface",
      {
        "flex items-center justify-center border border-brs3 rounded-md hover:bg-bgs2":
          variant === "icon-only",
        "p-1": variant === "icon-only" && size === Size.sm,
        "p-1.5": variant === "icon-only" && size !== Size.sm,
        "underline-dotted": variant === "inline"
      }
    )}
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
      if (isPopoverVisible) {
        dispatch("opened");
      } else {
        dispatch("closed");
      }
    }}
  >
    {#if variant === "icon-only" || variant === "inline-with-icon"}
      <Icon icon="calendar-blank" />
    {/if}
    {#if variant === "inline" || variant === "inline-with-icon"}
      {date ? parseAndFormatDate(date) : placeholder}
    {/if}
  </button>
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
