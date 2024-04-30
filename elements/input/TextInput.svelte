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
  import InlineMarkdownTextInput from "$lib/tidy/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Search from "$lib/tidy/icons/Search.svelte";
  import Icon from "../Icon.svelte";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  export let value: any;
  export let label: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;

  /**
   * !Deprecated
   * Use duration input instead
   */
  export let units: string[] | undefined = undefined;
  let unitClasses: string = "outline outline-bgs2 outline-2 rounded-md";
  let currentUnit: string | undefined = undefined;

  export let style: TextInputStyle = TextInputStyle.OUTLINED;
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let info: string | undefined = undefined;
  export let infoParams: FormLabelInfoTooltip | undefined = undefined;
  export let isEnableSaveFeedback: boolean = false;
  export let type: string = "text";
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  $: isSearchEnabled = searchStoreId || searchCallback;
  export let id: string = "";
  export let width: string | undefined = undefined;
  export let isRequired: boolean = false;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let numberInputParams:
    | { min: number; max: number; step: number }
    | undefined = undefined;
  export let isExperimentalMdInput: boolean = false;
  export let icon: string | undefined = undefined;
  const persistance = new Persistance();
  let isShowSaveFeedback: boolean = false;
  type SearchItem = Partial<DbRecordWithLabel & Record<string, unknown>>;
  let searchResults: SearchItem[] = [];
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
  let inputClasses: string = "text-input w-full";
  let changeTimer: any;
  let changeElaspsedTime: number = 0;
  let debounceTimeoutId: any;
  let isShowSearchResults: boolean = false;
  const dispatch = createEventDispatcher();
  onMount(() => {
    inputClasses = inputClasses + " " + resolveStyles().join(" ");
  });

  function resolveStyles() {
    /**
     * !Deprecated
     * Units are deprecated. Use duration input instead
     */
    if (!currentUnit) currentUnit = units ? units[0] : "";

    let styles: string[] = [];
    styles = [
      ...(resolveBackground() ?? []),
      ...(resolveBorder() ?? []),
      ...(resolvePadding() ?? [])
    ];
    if (icon) {
      styles.push("pl-8");
    }
    return styles;
    /**
     *text size propagated from parent - css
     */
    // if (size == Size.xl) inputClasses += " text-h3";
    // else if (size == Size.lg) inputClasses += " text-h4";
    // else if (size == Size.md)
    //   inputClasses +=
    //     " text-base " +
    //     (width
    //       ? width
    //       : labelOrientation === Orientation.Vertical
    //         ? "max-w-md"
    //         : "max-w-[16rem]");
    // else if (size == Size.sm) inputClasses += " text-b2";
    // else if (size == Size.xs) inputClasses += " text-b3";

    function resolveBackground() {
      if (style == TextInputStyle.PLAIN || style == TextInputStyle.OUTLINED) {
        return ["bg-transparent"];
      } else if (style === TextInputStyle.WITH_BACKGROUND) {
        return [bgClass($appearance, 0)];
      }
    }

    function resolveBorder() {
      if (
        style == TextInputStyle.WITH_BACKGROUND &&
        units &&
        units.length > 0
      ) {
        return ["rounded-r-none"];
      } else if (style === TextInputStyle.WITH_BACKGROUND) {
        //TODO - check if border required
        return ["rounded-md", "focus:border-aps1", "focus:outline-none"];
      } else if (style === TextInputStyle.OUTLINED) {
        return [
          "rounded-md",
          "border",
          borderClass($appearance, ColorStrength.Strong),
          "focus:border-aps1",
          "focus:outline-none"
        ];
      } else {
        return ["focus:border-none", "focus:outline-none"];
      }
    }
    function resolvePadding() {
      if (style === TextInputStyle.PLAIN) return;
      if (size === Size.md || size === Size.lg) {
        return ["p-2"];
      } else {
        return ["p-1"];
      }
    }
  }

  /**
   * !Deprecated
   * Use duration input instead
   */
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
    dispatch("keyup", { value, event });
  }
  function onSearchResultSelection(item: SearchItem) {
    dispatch("select", { item });
    isShowSearchResults = false;
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
    dispatch("keyup", { value, event, isShowSearchResults });
  }
  let debouncedSearch = debouncer(search, 100);
  async function search() {
    isShowSearchResults = true;
    isSearchInProgress = true;
    selectedIndex = 0;
    if (!value) {
      searchResults = [];
      return;
    }
    if (searchCallback) {
      let result = await searchCallback(value);
      // console.log("result of search callback: ", result);
      if (result) searchResults = result;
      isSearchInProgress = false;
      return;
    }
    if (searchStoreId)
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
    {#if isExperimentalMdInput}
      <div class={inputClasses}>
        <InlineMarkdownTextInput
          bind:content={value}
          {placeholder}
          on:keydown
          on:keyup
          on:focus
          on:blur
        />
      </div>
    {:else}
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown
        on:keyup|stopPropagation={isSearchEnabled
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
      {#if icon}
        <div class="absolute left-0 top-0 bottom-0 flex items-center px-1.5">
          <Icon {icon} size={Size.sm} />
        </div>
      {/if}
    {/if}

    {#if value && isSearchEnabled && isShowSearchResults}
      <div
        class="search-results bg-bgs1 shadow-md border border-brs2 overflow-y-auto rounded-b-md flex flex-col justify-between gap-1 items-start {searchResults?.length >
        5
          ? 'max-h-60 h-60'
          : 'h-48'} {style === TextInputStyle.PLAIN ? 'mt-[0.75rem]' : 'mt-1'}"
      >
        <div class="flex flex-col flex-grow items-center w-full">
          {#if searchResults && searchResults.length > 0}
            {#each searchResults as item, index}
              <SearchResultItem
                label={item.label ??
                  ("name" in item && typeof item.name == "string"
                    ? item.name
                    : "")}
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
        <div class="w-full flex justify-center">
          <Button
            size={Size.sm}
            label="close"
            parentBackgroundIndex={0}
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
  input::placeholder {
    font-weight: lighter;
    /* font-style: italic; */
    color: rgba(var(--colors-fgs2), 0.5);
  }
  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    border-top: none;
    z-index: 60;
  }
</style>
