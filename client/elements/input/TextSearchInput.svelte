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
  import { Position } from "$lib/client/types/direction.enum";
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
  let isFocused: boolean = false;
  let inputClasses: string =
    "text-input w-full bg-transparent focus:outline-none focus:border-none";
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
  function resolveStyles() {
    let styles: string[] = [];
    // if (icon) {
    //   styles.push("pl-8");
    // }
    return styles;
  }
  onMount(() => {
    inputClasses = inputClasses + " " + resolveStyles().join(" ");
  });
  function onKeyup(event: any) {
    if (!value) {
      hide();
      return;
    } else show();
    searchResultsPopover.keyup(event);
  }
  export function reset() {
    onReset();
  }
  function onReset() {
    value = "";
    hide();
  }
</script>

<InputBaseElement
  bind:this={popoverRef}
  popoverOptions={{
    class: "flex flex-col justify-between gap-1 items-start",
    isSpanToTriggerWidth: true,
    isPreventDefault: true,
    placement: Position.BottomCenter,
    ...popoverOptions
  }}
  {label}
  {style}
  {isFocused}
  class="w-full flex gap-2"
>
  {#if icon}
    <Icon {icon} />
  {/if}
  <input
    {id}
    class={inputClasses}
    bind:value
    on:change|stopPropagation
    on:keydown
    on:keyup|stopPropagation={onKeyup}
    on:blur
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
  />
  <slot name="popover" slot="popover">
    <SearchResultsPopover
      bind:this={searchResultsPopover}
      on:hide={hide}
      {searchStoreId}
      {searchCallback}
      {searchResultComponent}
      on:select
      on:reset={onReset}
    />
  </slot>
</InputBaseElement>

<style>
  input::placeholder {
    font-weight: lighter;
    /* font-style: italic; */
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
