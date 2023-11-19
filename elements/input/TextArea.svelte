<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import FormControlLabel from "../text/FormControlLabel.svelte";
  import { userPreferences, windowObject } from "$lib/tidy/stores/app.store";
  import { bg, borderColor } from "$lib/tidy/utils/theme.utils";
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  export let value: any;
  export let label: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let units: string[] | undefined = undefined;
  export let style: TextInputStyle = TextInputStyle.BOXED;
  export let size: Size = Size.md;
  export let info: string | undefined = undefined;
  export let isEnableSaveFeedback: boolean = false;
  export let rows: number = 5;
  export let resizable: boolean = false;
  export let classList: string = "";
  export let isRequired: boolean = false;
  let isShowSaveFeedback: boolean = false;
  let searchResults: DbRecordWithLabel[] = [];
  let selectedIndex: number = 0;
  export function focus() {
    if (inputRef) inputRef.focus();
  }
  export function blur() {
    if (inputRef) inputRef.blur();
  }
  export function reset() {
    resetSearch();
    value = "";
  }
  let inputRef: any;
  export let isDisabled = false;
  let inputClasses: string = "text-input w-full rounded-sm";
  let unitClasses: string = "outline outline-bgs2 outline-2 rounded-sm";
  let currentUnit: string | undefined = undefined;
  let changeTimer: any;
  let changeElaspsedTime: number = 0;
  const dispatch = createEventDispatcher();
  onMount(() => {
    if (!currentUnit) currentUnit = units ? units[0] : "";
    if (style == TextInputStyle.PLAIN || style == TextInputStyle.OUTLINED) {
      inputClasses += " bg-transparent";
    } else if (style === TextInputStyle.BOXED) {
      inputClasses += ` ${bg($userPreferences.theme, 1)} border ${borderColor(
        $userPreferences.theme
      )} p-2`;
      unitClasses = unitClasses + " p-2";
    }
    if (style == TextInputStyle.BOXED && units && units.length > 0) {
      inputClasses += " rounded-r-none";
      unitClasses = unitClasses + " rounded-l-none";
    } else if (
      style === TextInputStyle.BOXED ||
      style === TextInputStyle.OUTLINED
    ) {
      inputClasses += " focus:outline-a1";
      if (style === TextInputStyle.OUTLINED)
        inputClasses += ` outline outline-2 outline-fgs3 p-2`;
    } else {
      inputClasses += " focus:border-none focus:outline-none";
    }
    if (size == Size.xl) inputClasses += " text-h3";
    else if (size == Size.lg) inputClasses += " text-base";
    else if (size == Size.md) inputClasses += " text-base max-w-md";
    else if (size == Size.sm) inputClasses += " text-b2";
    else if (size == Size.xs) inputClasses += " text-b3";
  });
  function onUnitClick() {
    if (units?.length == 2) {
      if (currentUnit == units[0]) currentUnit = units[1];
      else currentUnit = units[0];
    }
    //todo - if more than 2 units - show dropdown
    dispatch("unitChange", { unit: currentUnit });
  }
  function onChange() {
    dispatch("input", { value });
    isShowSaveFeedback = false;
    resetChangeTimer();
  }
  function resetChangeTimer() {
    changeElaspsedTime = 0;
    clearTimeout(changeTimer);
    changeTimer = setInterval(() => {
      changeElaspsedTime += 1;
    }, 1000);
  }
  $: {
    if (changeElaspsedTime > 1) {
      isShowSaveFeedback = true;
      setTimeout(() => {
        isShowSaveFeedback = false;
        changeElaspsedTime = 0;
        clearTimeout(changeTimer);
      }, 2000);
    }
  }

  function resetSearch() {
    searchResults = [];
    selectedIndex = 0;
  }
</script>

<div class="flex flex-col gap-1 w-full">
  {#if label}
    <FormControlLabel {label} info={{ body: info ?? "" }} {isRequired} />
  {/if}
  <div class="relative flex items-center w-full">
    <textarea
      style="max-width:unset;"
      class={`${`text-b3 outline-[1px] ${
        $windowObject.isInPortraitMode ? `max-w-[unset]` : ``
      }`} ${resizable ? `` : `resize-none`} ${inputClasses}`}
      {rows}
      bind:value
      on:change
      on:keydown
      on:keyup
      on:blur
      on:focus
      on:input={onChange}
      {placeholder}
      disabled={isDisabled}
      bind:this={inputRef}
    />
    {#if isEnableSaveFeedback && isShowSaveFeedback}
      <div class="absolute right-0 text-b2 text-fgs2">saved</div>
    {/if}
    {#if units}
      <div class={unitClasses}>
        <button on:click={onUnitClick}>
          {currentUnit}
        </button>
      </div>
    {/if}
    {#if $$slots && $$slots.default}
      <div class="ml-4">
        <slot />
      </div>
    {/if}
  </div>
</div>
