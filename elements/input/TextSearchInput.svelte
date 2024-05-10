<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SearchResultItem from "./SearchResultItem.svelte";
  import { bgClass, borderClass } from "$lib/tidy/utils/theme.utils";
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import Button from "../button/Button.svelte";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { debouncer } from "$lib/tidy/utils/utils";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import Popover from "../popover/Popover.svelte";
  export let value: any;
  export let label: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let style: TextInputStyle = TextInputStyle.OUTLINED;
  export let size: Size = Size.md;
  export let infoParams: FormLabelInfoTooltip | undefined = undefined;
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let id: string = "";
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let icon: string | undefined = undefined;
  type SearchItem = Partial<DbRecordWithLabel & Record<string, unknown>>;
  let results: SearchItem[] = [];
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
  const dispatch = createEventDispatcher();
  onMount(() => {
    inputClasses = inputClasses + " " + resolveStyles().join(" ");
  });

  function resolveStyles() {
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

    function resolveBackground() {
      if (style == TextInputStyle.PLAIN || style == TextInputStyle.OUTLINED) {
        return ["bg-transparent"];
      } else if (style === TextInputStyle.WITH_BACKGROUND) {
        return [bgClass($appearance, 0)];
      }
    }

    function resolveBorder() {
      if (style === TextInputStyle.WITH_BACKGROUND) {
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
  function onSearchResultSelection(item: SearchItem) {
    dispatch("select", { item });
    hide();
  }
  function resetSearch() {
    results = [];
    selectedIndex = 0;
    hide();
  }
  function handleKeyUpForSearch(event: any) {
    if (event.key === "Escape") {
      resetSearch();
      inputRef.blur();
      dispatch("blur");
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1);
      if (selectedIndex === results?.length) {
        selectedIndex = 0;
      }
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
      if (selectedIndex === -1) {
        selectedIndex = results?.length;
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
      if (results && results.length > 0) {
        onSearchResultSelection(results[selectedIndex]);
      } else {
        //save();
      }
    } else {
      currentValue = (event.target as HTMLInputElement).value;
      debouncedSearch();
    }
    dispatch("keyup", { value, event });
  }
  let debouncedSearch = debouncer(search, 100);
  async function search() {
    isSearchInProgress = true;
    selectedIndex = 0;
    if (!value) {
      results = [];
      return;
    }
    if (searchCallback) {
      let result = await searchCallback(value);
      if (result) results = result;
      isSearchInProgress = false;
      if (results.length > 0) {
        show();
      }
      return;
    }
    if (searchStoreId) results = await dataManager.search(searchStoreId, value);
    isSearchInProgress = false;
    if (results.length > 0) {
      show();
    }
  }

  let popoverRef: any;
  function show() {
    popoverRef?.show();
  }
  function hide() {
    popoverRef?.hide();
  }
</script>

<Popover
  bind:this={popoverRef}
  isPreventDefault={true}
  options={{
    class: "overflow-y-auto flex flex-col justify-between gap-1 items-start",
    isSpanToTriggerWidth: true
  }}
  triggerClass="w-full"
>
  <slot name="trigger" slot="trigger">
    <FormControlLabelWrapper
      {label}
      info={infoParams}
      orientation={labelOrientation}
    >
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown
        on:keyup|stopPropagation={handleKeyUpForSearch}
        on:blur
        on:focus
        on:input
        type="text"
        {placeholder}
        disabled={isDisabled}
        bind:this={inputRef}
      />
    </FormControlLabelWrapper>
  </slot>
  <slot name="popover" slot="popover">
    <div
      class="{results?.length > 5 ? 'max-h-60 h-60' : 'h-48'} {style ===
      TextInputStyle.PLAIN
        ? 'mt-[0.75rem]'
        : 'mt-1'}"
    >
      <div class="flex flex-col flex-grow items-center w-full">
        {#if results && results.length > 0}
          {#each results as item, index}
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
            {:else if results.length === 0}
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
  </slot>
</Popover>

<style>
  input::placeholder {
    font-weight: lighter;
    /* font-style: italic; */
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
