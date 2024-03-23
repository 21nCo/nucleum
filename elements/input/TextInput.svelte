<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SearchResultItem from "./SearchResultItem.svelte";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import { bgClass, borderClass } from "$lib/tidy/utils/theme.utils";
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import Button from "../button/Button.svelte";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { debouncer } from "$lib/tidy/utils/utils";
  import appearance from "$lib/tidy/stores/appearance.store";
  export let value: any;
  export let label: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let units: string[] | undefined = undefined;
  export let style: TextInputStyle = TextInputStyle.OUTLINED;
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let info: string | undefined = undefined;
  export let infoParams: FormLabelInfoTooltip | undefined = undefined;
  export let isEnableSaveFeedback: boolean = false;
  export let type: string = "text";
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let id: string = "";
  export let width: string | undefined = undefined;
  export let isRequired: boolean = false;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let numberInputParams:
    | { min: number; max: number; step: number }
    | undefined = undefined;
  const persistance = new Persistance();
  let isShowSaveFeedback: boolean = false;
  let searchResults: DbRecordWithLabel[] = [];
  let selectedIndex: number = 0;
  let previousValue: string = "";
  let currentValue: string;
  let isSearchInProgress: boolean = false;
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
  let debounceTimeoutId: any;
  const dispatch = createEventDispatcher();
  onMount(() => {
    if (!currentUnit) currentUnit = units ? units[0] : "";
    if (style == TextInputStyle.PLAIN || style == TextInputStyle.OUTLINED) {
      inputClasses += " bg-transparent";
    } else if (style === TextInputStyle.WITH_BACKGROUND) {
      inputClasses += ` ${bgClass($appearance, 0)} border-2 ${borderClass(
        $appearance
      )} p-2`;
      unitClasses = unitClasses + " p-2";
    }
    if (style == TextInputStyle.WITH_BACKGROUND && units && units.length > 0) {
      inputClasses += " rounded-r-none";
      unitClasses = unitClasses + " rounded-l-none";
    } else if (
      style === TextInputStyle.WITH_BACKGROUND ||
      style === TextInputStyle.OUTLINED
    ) {
      inputClasses += " focus:border-aps1 focus:outline-none";
      if (style === TextInputStyle.OUTLINED)
        inputClasses += ` border border-2  border-brs2 p-2`;
    } else {
      inputClasses += " focus:border-none focus:outline-none";
    }
    if (size == Size.xl) inputClasses += " text-h3";
    else if (size == Size.lg) inputClasses += " text-h4";
    else if (size == Size.md)
      inputClasses +=
        " text-base " +
        (width
          ? width
          : labelOrientation === Orientation.Vertical
            ? "max-w-md"
            : "max-w-[16rem]");
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
  function handleKeyUp(event: any) {
    if (event.key === "Enter") {
      dispatch("enter", { value });
    } else if (event.key === "Escape") {
      inputRef.blur();
      dispatch("blur");
    }
    dispatch("keyup", { value });
  }
  function onSearchResultSelection(item: DbRecordWithLabel) {
    dispatch("select", { item });
  }
  function resetSearch() {
    searchResults = [];
    selectedIndex = 0;
  }
  function handleKeyUpForSearch(event: any) {
    if (event.key === "Escape") {
      resetSearch();
      inputRef.blur();
      dispatch("blur");
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1);
      if (selectedIndex === searchResults?.length) {
        selectedIndex = 0;
      }
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
      if (selectedIndex === -1) {
        selectedIndex = searchResults?.length;
      }
    } else if (event.key === "Backspace") {
      previousValue = currentValue;
      currentValue = (event.target as HTMLInputElement).value;
      if (previousValue?.length > currentValue.length) {
        const deletedChar = previousValue.charAt(previousValue.length - 1);
        if (deletedChar === "#") {
          //
        }
      }
      debouncedSearch();
    } else if (event.key === "Enter" && value) {
      if (searchResults && searchResults.length > 0) {
        onSearchResultSelection(searchResults[selectedIndex]);
      } else {
        //save();
      }
    } else {
      currentValue = (event.target as HTMLInputElement).value;
      debouncedSearch();
    }
  }
  let debouncedSearch = debouncer(search, 100);
  async function search() {
    if (!searchStoreId) return;
    isSearchInProgress = true;
    selectedIndex = 0;
    if (!value) {
      searchResults = [];
      return;
    }
    if (searchCallback) {
      let result = await searchCallback(value);
      if (result) searchResults = result;
      isSearchInProgress = false;
      return;
    }
    searchResults = await dataManager.search(searchStoreId, value);
    isSearchInProgress = false;
  }
</script>

<FormControlLabelWrapper
  {label}
  info={info ? { body: info } : infoParams}
  {isRequired}
  orientation={labelOrientation}
>
  {#if type === "password"}
    <div>
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown|stopPropagation
        on:keyup|stopPropagation
        on:blur
        on:focus
        on:input|stopPropagation={onChange}
        type="password"
        {placeholder}
        disabled={isDisabled}
        bind:this={inputRef}
      />
    </div>
  {:else if type === "number"}
    <input
      {id}
      class={inputClasses}
      bind:value
      on:change|stopPropagation
      on:keydown|stopPropagation
      on:keyup|stopPropagation
      on:blur
      on:focus
      on:input|stopPropagation={onChange}
      type="number"
      min={numberInputParams?.min}
      max={numberInputParams?.max}
      step={numberInputParams?.step}
      {placeholder}
      disabled={isDisabled}
      bind:this={inputRef}
    />
  {:else}
    <input
      {id}
      class={inputClasses}
      bind:value
      on:change|stopPropagation
      on:keydown
      on:keyup|stopPropagation={searchStoreId
        ? handleKeyUpForSearch
        : handleKeyUp}
      on:blur
      on:focus
      on:input|stopPropagation={onChange}
      type="text"
      {placeholder}
      disabled={isDisabled}
      bind:this={inputRef}
    />
    {#if value && searchStoreId}
      <div
        class="search-results bg-bgs2 mt-[0.75rem] shadow-md overflow-y-auto rounded-b-md flex flex-col justify-between gap-1 items-start {searchResults?.length >
        5
          ? 'max-h-60 h-60'
          : 'h-48'}"
      >
        <div class="flex flex-col flex-grow items-center w-full">
          {#if searchResults && searchResults.length > 0}
            {#each searchResults as item, index}
              <SearchResultItem
                {item}
                isActive={selectedIndex === index}
                on:click={() => {
                  onSearchResultSelection(item);
                }}
              />
            {/each}
          {:else}
            <div class="flex w-full justify-center p-2 text-b3 text-fgs3">
              {#if isSearchInProgress}
                Searching...
              {:else if searchResults.length === 0}
                No results found
              {/if}
            </div>
          {/if}
        </div>
        <div class="w-full bg-bgs2 flex justify-center">
          <Button
            size={Size.sm}
            label="close"
            parentBackgroundIndex={1}
            on:click={() => {
              value = "";
              resetSearch();
            }}
          />
        </div>
      </div>
    {/if}
  {/if}
  <!-- {#if isEnableSaveFeedback && isShowSaveFeedback}
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
    {/if} -->
</FormControlLabelWrapper>

<!-- placeholder={placeholder ?? ""} -->

<style>
  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    border-top: none;
    z-index: 10;
  }
</style>
