<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import AutocompleteResultItem from "./AutocompleteResultItem.svelte";
  import type { AutocompleteListItemType } from "$lib/tidy/types/autocompleteListItem.type";
  import Search from "$lib/tidy/icons/Search.svelte";
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import { appEvents, userPreferences } from "$lib/tidy/stores/app.store";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import Icon from "../Icon.svelte";
  import { IconVariant } from "$lib/tidy/types/icon.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { bgClass } from "$lib/tidy/utils/theme.utils";

  export let wrapperClassList: string = "w-full";
  export let wrapperStyle: string = "";
  export let inputClassList: string = "text-bgs2";
  export let inputStyle: string = "";
  export let listContainerClassList: string = "bg-bgs2";
  export let listContainerStyle: string = "";
  export let listItemClassList: string = "hover:bg-bgs3";
  export let listItemStyle: string = "";
  export let activeListItemClassList: string = "bg-bgs3";
  export let areOptionsVisible: boolean = false;

  export let escapeDefaultClickBehaviour: boolean = false; // this is used to escape the default behaviour of the list item click, if this is true then the default behaviour of the list item click will not be performed, for example if you don't want to hide the list on list item click then set this to true

  export let hideSearchIcon: boolean = false;
  export let hideResetIcon: boolean = false;
  export let icon: string = "";

  export let options: AutocompleteListItemType[] = [];

  export let placeholder: string = "";
  export let inputValue: string;
  export let value: AutocompleteListItemType | null = null;

  const dispatch = createEventDispatcher();
  const containerId = generateUID();

  let inputRef: HTMLInputElement | undefined;
  // let iconComponent: typeof SvelteComponent | undefined;
  let selectedListItemIndex: number = -1;

  let tempOptions: AutocompleteListItemType[] = [];

  // function hideList() {
  //   selectedListItemIndex = -1;
  //   if (options === undefined || options.length === 0) return;
  //   options = [];

  // }

  function hideOptions() {
    selectedListItemIndex = -1;
    if (options === undefined || options.length === 0) return;
    areOptionsVisible = false;
  }

  function performDefaultClickActions() {
    hideOptions();
  }

  function updateValue(detail: { label: string; id: string }) {
    inputValue = detail.label;
    value = detail;
  }

  function handleResultItemClick(detail: { label: string; id: string }) {
    dispatch("list-item-click", detail);
    updateValue(detail);
    if (!escapeDefaultClickBehaviour) {
      performDefaultClickActions();
      // because since there are chips, we don't want to hide the list on click, because the user might want to select multiple items
    }
  }

  function handleResultItemClickViaCustomEvent({ detail }: CustomEvent) {
    handleResultItemClick(detail);
  }

  function focusOnInput() {
    if (inputRef) inputRef.focus();
  }

  function onFocus() {
    updateListVisibility(true);
    tempOptions = options;
  }

  function onReset() {
    inputValue = "";
    value = null;
    dispatch("reset");
  }

  function updateListVisibility(value: boolean) {
    areOptionsVisible = value;
  }

  function onInputChange() {
    value = options.find((x) => x.label === inputValue) ?? null;
  }

  function handleKeyDownInDropdown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      hideOptions();
    }
    if (event.key === "ArrowDown") {
      if (selectedListItemIndex < tempOptions.length - 1) {
        selectedListItemIndex++;
      }
    }
    if (event.key === "ArrowUp") {
      if (selectedListItemIndex > -1) {
        selectedListItemIndex--;
      }
    }
    if (event.key === "Enter") {
      if (selectedListItemIndex > -1) {
        const { label: title, id } = tempOptions[selectedListItemIndex];
        dispatch("list-item-click", { title, id });
        if (!escapeDefaultClickBehaviour) {
          performDefaultClickActions();
        }
      }
    }
  }

  // $: {
  //   if (inputValue === "") {
  //     tempOptions = options;
  //   } else {
  //     tempOptions = options.filter((goal: AutocompleteListItemType) => {
  //       return goal.title.toLowerCase().includes(inputValue.toLowerCase());
  //     });
  //   }
  // }

  $: {
    selectedListItemIndex = -1;
    if (!inputValue) {
      tempOptions = options;
    }
    if (value) updateListVisibility(false);
    else if (
      inputValue !== undefined &&
      inputValue !== null &&
      inputValue !== "" &&
      options.length !== 0
    ) {
      updateListVisibility(true);
      tempOptions = options.filter((x) =>
        x.label.toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  // onMount(() => {
  //   setTimeout(() => {
  //     focusOnInput();
  //   }, 0);
  // });

  appEvents.subscribe((x: AppEventType) => {
    if (
      x.event === AppEvent.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `#${containerId}`, hideOptions);
    }
  });
</script>

<div
  id={containerId}
  style={wrapperStyle}
  class={`relative ${wrapperClassList}`}
>
  <div class="realtive flex items-center w-full">
    {#if icon || !hideSearchIcon}
      <div
        class="absolute ml-2.5 min-w-[1rem] flex justify-center items-center w-4 h-4"
      >
        {#if icon}
          <!-- <svelte:component this={iconComponent || Search} /> -->
          <Icon {icon} size={Size.sm} variant={IconVariant.Outline} />
        {:else if !hideSearchIcon}
          <Icon
            size={Size.sm}
            icon="search-mini"
            variant={IconVariant.Outline}
          />
        {/if}
      </div>
    {/if}
    {#if !hideResetIcon}
      <div
        class="absolute right-0 mr-2.5 min-w-[1rem] flex justify-center items-center w-4 h-4"
      >
        <Icon
          on:click={onReset}
          size={Size.sm}
          icon="cross"
          variant={IconVariant.Outline}
        />
      </div>
    {/if}

    <input
      style={inputStyle}
      type="text"
      bind:this={inputRef}
      bind:value={inputValue}
      on:input|stopPropagation={onInputChange}
      on:focus={onFocus}
      on:keydown|stopPropagation={handleKeyDownInDropdown}
      on:keyup|stopPropagation={() => dispatch("search")}
      class={`outline-none w-full py-2 px-2.5 text-b2 ${
        hideSearchIcon && !icon ? `` : `pl-8`
      } ${inputClassList} ` + bgClass($userPreferences.theme, 1)}
      {placeholder}
      aria-label="Search"
      aria-describedby="search-addon"
    />
  </div>
  {#if tempOptions && tempOptions.length > 0 && areOptionsVisible}
    <div
      style={listContainerStyle}
      class={`absolute w-full z-[10] max-h-[10rem] overflow-auto ${listContainerClassList}`}
    >
      {#each tempOptions as listItem, index}
        <AutocompleteResultItem
          {...listItem}
          classList={{
            common: listItemClassList,
            active: activeListItemClassList
          }}
          isActive={selectedListItemIndex === index}
          style={listItemStyle}
          on:click={handleResultItemClickViaCustomEvent}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- 
  Note: Just need to implement one thing, which is if we navigate in the list using arrow keys then the list should scroll automatically to the selected item
 -->
