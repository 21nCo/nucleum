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
  export let emptyStateLabel: string | undefined = undefined;
  export let isPreventDefaultResults: boolean = false;
  export let isChipsMode: boolean = false;
  let isFocused: boolean = false;
  let chips: any[] = [];
  let inputRef: any;
  let popoverRef: any;
  let searchResultsPopover: any;
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
    on:keydown
    on:keyup|stopPropagation={onKeyup}
    on:blur
    on:click|stopPropagation
    on:mouseup|stopPropagation
    on:blur={() => {
      isFocused = false;
      dispatch("blur");
    }}
    on:focus={() => {
      isFocused = true;
      dispatch("focus");
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
      on:select={onSelect}
      on:empty-enter
      on:reset={onReset}
    />
  </slot>
</InputBaseElement>
