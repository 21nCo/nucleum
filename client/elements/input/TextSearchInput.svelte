<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import SearchResultsPopover from "./SearchResultsPopover.svelte";
  import InputBaseElement from "../InputBaseElement.svelte";
  import {
    InputStyle,
    type InputLabel,
    type PopoverInputOptions
  } from "$lib/client/types/input.type";
  import Icon from "../Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { mount } from "$lib/client/actions/mount.action";
  import Tag from "../text/Tag.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import TextInput from "./TextInput.svelte";
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
  export let emptyStateLabel: string | undefined = undefined;
  export let isPreventDefaultResults: boolean = false;
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
    if (isPreventDefaultResults) return;
    show();
    searchResultsPopover?.search();
  }

  function onKeyup(event: any) {
    if (
      (!value && isPreventDefaultResults) ||
      (!searchCallback && !searchStoreId)
    ) {
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
      on:keyup={(event) => {
        searchResultsPopover.keyup(event.detail.event);
      }}
      on:keydown={(event) => {
        searchResultsPopover.keydown(event);
      }}
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
      use:mount={showDefaultResults}
      class={cn(
        "text-input bg-transparent focus:outline-none focus:border-none placeholder:font-light placeholder:text-fgs3 placeholder:text-b2",
        {
          "w-full": !isChipsMode,
          "min-w-10 flex-1": isChipsMode
        }
      )}
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
      on:blur={(e) => {
        isFocused = false;
        dispatch("blur");
        if (isShowPopoverOnFocus) {
          if (!e.target?.classList?.contains("text-input")) {
            hide();
          }
        }
      }}
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
