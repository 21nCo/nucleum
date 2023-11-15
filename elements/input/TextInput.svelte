<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import FormControlLabel from "../text/FormControlLabel.svelte";
  import SearchResultItem from "./SearchResultItem.svelte";
  import type { ItemType } from "$lib/tidy/types/item.enum";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import Element from "../Element.svelte";
  import { bg, borderColor } from "$lib/tidy/utils/theme.utils";
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import FormControlLabelWrapper from "./FormControlLabelWrapper.svelte";
  export let value: any;
  export let label: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let units: string[] | undefined = undefined;
  export let style: TextInputStyle = TextInputStyle.BOXED;
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let info: string | undefined = undefined;
  export let isEnableSaveFeedback: boolean = false;
  export let type: string = "text";
  export let searchItemType: ItemType | undefined = undefined;
  export let id: string = "";
  export let isRequired: boolean = false;
  export let labelOrientation: Orientation = Orientation.Vertical;
  const persistance = new Persistance();
  let isShowSaveFeedback: boolean = false;
  let searchResults: DbRecordWithLabel[] = [];
  let selectedIndex: number = 0;
  let previousValue: string = "";
  let currentValue: string;
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
    else if (size == Size.md)
      inputClasses +=
        " text-base " +
        (labelOrientation === Orientation.Vertical
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
      search();
    } else if (event.key === "Enter" && value) {
      if (searchResults && searchResults.length > 0) {
        onSearchResultSelection(searchResults[selectedIndex]);
      } else {
        //save();
      }
    } else {
      currentValue = (event.target as HTMLInputElement).value;
      search();
    }
  }
  async function search() {
    if (!searchItemType) return;
    selectedIndex = 0;
    if (!value) {
      searchResults = [];
      return;
    }
    searchResults = await persistance.searchByLabel(value, searchItemType);
  }
</script>

<FormControlLabelWrapper {label} {info} orientation={labelOrientation}>
  {#if type === "password"}
    <div>
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change
        on:keydown
        on:keyup
        on:blur
        on:focus
        on:input={onChange}
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
      on:change
      on:keydown
      on:keyup
      on:blur
      on:focus
      on:input={onChange}
      type="number"
      {placeholder}
      disabled={isDisabled}
      bind:this={inputRef}
    />
  {:else}
    <input
      {id}
      class={inputClasses}
      bind:value
      on:change
      on:keydown
      on:keyup={searchItemType ? handleKeyUpForSearch : handleKeyUp}
      on:blur
      on:focus
      on:input={onChange}
      type="text"
      {placeholder}
      disabled={isDisabled}
      bind:this={inputRef}
    />
    {#if searchResults && searchResults.length > 0}
      <div
        class="search-results bg-bgs3 h-max max-h-60 overflow-auto rounded-md flex flex-col gap-1 items-start"
      >
        {#each searchResults as item, index}
          <SearchResultItem
            {item}
            isActive={selectedIndex === index}
            on:click={() => {
              onSearchResultSelection(item);
            }}
          />
        {/each}
        <Element
          classList="w-full rounded-b-md py-2 text-center mt-10"
          parentBackgroundIndex={2}
          on:click={() => {
            resetSearch();
          }}>close</Element
        >
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
