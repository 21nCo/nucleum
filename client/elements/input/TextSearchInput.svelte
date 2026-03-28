<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import SearchResultsPopover from "@21n/elements/input/SearchResultsPopover.svelte";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import {
    InputStyle,
    type InputLabel,
    type PopoverInputOptions
  } from "@21n/types/input.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { mount } from "@21n/actions/mount.action";
  import Tag from "@21n/elements/text/Tag.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { isExtensionEnvironment } from "@21n/utils/browser.utils";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  const dispatch = createEventDispatcher();
  export let id: string = "";
  export let placeholder: string | undefined = undefined;
  export let value: any;
  export let isDisabled = false;
  export let icon: string | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let popoverOptions: PopoverInputOptions | undefined = undefined;
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let searchResultComponent: any = undefined;
  export let searchResultComponentProps: Record<string, unknown> = {};
  export let emptyStateLabel:
    | string
    | { mainText?: string; subText?: string }
    | undefined = undefined;
  export let isChipsMode: boolean = false;
  /**
   * If true, the search results popover will be shown inline with the input element instead as a popover.
   */
  export let isInline: boolean = false;
  export let width: string | undefined = undefined;
  /**
   * Message to be shown at the bottom of the search results popover - will be shown at the bottom left corner
   */
  export let bottomMessage: string | undefined = undefined;
  /**
   * If true, the search results popover will be shown when the input is focused and hidden when the input is blurred.
   */
  export let isShowPopoverOnFocus: boolean = false;
  export let isShowDefaultResultsOnMount: boolean = false;
  let isFocused: boolean = false;
  let chips: any[] = [];
  let inputRef: any;
  let popoverRef: any;
  let searchResultsPopover: SearchResultsPopover;
  export function focus() {
    if (inputRef) inputRef.focus();
  }
  export function blur() {
    if (inputRef) inputRef.blur();
  }
  function show() {
    popoverRef?.showPopover();
  }
  function hide() {
    popoverRef?.hidePopover();
    dispatch("hide");
  }

  export function showDefaultResults() {
    show();
    searchResultsPopover?.search();
  }

  function resolveKeyboardEvent(
    event: CustomEvent<{ event?: KeyboardEvent } | KeyboardEvent>
  ) {
    if (event.detail instanceof KeyboardEvent) return event.detail;
    if (event.detail?.event instanceof KeyboardEvent) return event.detail.event;
    return event as unknown as KeyboardEvent;
  }

  function onInlineKeyup(
    event: CustomEvent<{ event?: KeyboardEvent } | KeyboardEvent>
  ) {
    const keyboardEvent = resolveKeyboardEvent(event);
    if (!keyboardEvent) return;
    searchResultsPopover.keyup(keyboardEvent);
  }

  function onInlineKeydown(
    event: CustomEvent<{ event?: KeyboardEvent } | KeyboardEvent>
  ) {
    const keyboardEvent = resolveKeyboardEvent(event);
    if (!keyboardEvent) return;
    searchResultsPopover.keydown(keyboardEvent);
  }

  function onKeyup(event: any) {
    if (!searchCallback && !searchStoreId) {
      hide();
      // return;
    } else show();
    searchResultsPopover.keyup(event);
    dispatch("change", { value });
  }
  export function reset() {
    onReset();
    searchResultsPopover?.reset();
  }

  function onInputBlur(e: FocusEvent) {
    isFocused = false;
    dispatch("blur");
    if (isShowPopoverOnFocus) {
      const target = e.target as HTMLElement | null;
      if (!target?.classList?.contains("text-input")) {
        hide();
      }
    }
  }

  function onReset() {
    value = "";
    hide();
  }

  function onSelect(e: CustomEvent) {
    if (!isChipsMode) {
      dispatch("select", e.detail);
    }
    chips = [...chips, e.detail.item];
    value = "";
  }
</script>

{#if isInline}
  <div
    class={cn(
      "flex flex-col gap-1 bg-bgs1 p-2 rounded-md border border-brs2",
      width && width,
      {
        "mo:w-full w-[30rem] max-w-full": !width
      }
    )}
  >
    <TextInput
      bind:value
      bind:this={inputRef}
      {placeholder}
      {style}
      on:keyup={onInlineKeyup}
      on:keydown={onInlineKeydown}
    />
    <SearchResultsPopover
      bind:this={searchResultsPopover}
      {searchStoreId}
      {searchCallback}
      {emptyStateLabel}
      {searchResultComponent}
      {searchResultComponentProps}
      {bottomMessage}
      on:select={onSelect}
      on:empty-enter
      on:reset
      on:hide
    />
  </div>
{:else}
  <InputBaseElement
    bind:this={popoverRef}
    popoverOptions={{
      class: "flex flex-col justify-between gap-1 items-start",
      isSpanToTriggerWidth: true,
      isPreventDefault: true,
      placement: Placement.BottomCenter,
      isUseAbsolutePositioning: isExtensionEnvironment(),
      ...popoverOptions
    }}
    {label}
    {style}
    {isFocused}
    class={cn("w-full flex gap-2", {
      "flex-wrap": isChipsMode
    })}
  >
    {#if icon}
      <Icon {icon} class="stroke-fgs3" size={Size.sm} />
    {/if}
    {#if isChipsMode && chips.length > 0}
      <div class="flex gap-2 flex-wrap">
        {#each chips as chip}
          <Tag
            label={chip.label}
            size={Size.sm}
            on:remove={() => {
              chips = chips.filter((c) => c.id !== chip.id);
            }}
          />
        {/each}
      </div>
    {/if}
    <input
      {id}
      use:mount={isShowDefaultResultsOnMount ? showDefaultResults : () => {}}
      class={cn(
        "text-input bg-transparent focus:outline-none focus:border-none placeholder:font-light placeholder:text-fgs3 placeholder:text-b2",
        {
          "w-full": !isChipsMode,
          "min-w-10 flex-1": isChipsMode
        }
      )}
      tabindex="0"
      bind:value
      on:change|stopPropagation
      on:keydown={(event) => {
        searchResultsPopover.keydown(event);
        dispatch("keydown", event);
      }}
      on:keyup|stopPropagation={onKeyup}
      on:blur
      on:click|stopPropagation
      on:mouseup|stopPropagation
      on:blur={onInputBlur}
      on:focus={() => {
        isFocused = true;
        dispatch("focus");
        if (isShowPopoverOnFocus) {
          show();
          showDefaultResults();
        }
      }}
      type="text"
      {placeholder}
      disabled={isDisabled}
      bind:this={inputRef}
      autocomplete="off"
    />
    <slot name="popover" slot="popover">
      <SearchResultsPopover
        bind:this={searchResultsPopover}
        on:hide={hide}
        {searchStoreId}
        {searchCallback}
        {emptyStateLabel}
        {searchResultComponent}
        {searchResultComponentProps}
        {bottomMessage}
        on:select={onSelect}
        on:empty-enter
        on:reset={onReset}
      />
    </slot>
  </InputBaseElement>
{/if}
