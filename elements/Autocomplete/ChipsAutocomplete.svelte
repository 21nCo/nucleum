<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import AutocompleteResultItem from "./AutocompleteResultItem.svelte";
  import type { AutocompleteListItemType } from "$lib/tidy/types/autocompleteListItem.type";
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import Chip from "./Chip.svelte";
  import { ChipVariant } from "$lib/tidy/types/chipVariant.enum";
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { appEvents } from "$lib/tidy/stores/app.store";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { resolveBackgroundClass } from "$lib/tidy/utils/theme.utils";
  import FormControlLabel from "../text/FormControlLabel.svelte";
  export let listContainerStyle: string = "";
  export let listItemStyle: string = "";
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let inputStyle: TextInputStyle = TextInputStyle.OUTLINED;
  export let isListVisible: boolean = false;
  export let options: AutocompleteListItemType[] = [];
  export let placeholder: string = "";
  export let values: AutocompleteListItemType[] = [];
  export let label: string = "";
  export let chipsVariant: ChipVariant = ChipVariant.FILLED;
  let listContainerClassList: string = "bg-bgs2 shadow-sm shadow-fgs3";
  let isFocusing: boolean = false;
  let inputValue: string;
  const wrapperId = generateUID(); // main wrapper, outside which if clicked then the list will be hidden
  let id = generateUID(); // this is the id of the input field
  let isActive: boolean = false;
  let backgroundColor: string;
  let defaultInputClasses: string = "text-input w-full rounded-sm";

  let tempOptions: AutocompleteListItemType[] = [];

  const dispatch = createEventDispatcher();

  let selectedListItemIndex: number = -1;

  function focusOnInput() {
    const input = document.getElementById(id);
    if (input) input.focus();
  }

  function toggleActiveState(value?: boolean) {
    if (value !== undefined) {
      isActive = value;
      // make focus on id
    } else {
      isActive = !isActive;
    }
    if (isActive) {
      focusOnInput();
    }
  }

  function actionsWhenClickOutside() {
    toggleActiveState(false);
    hideOptions();
    updateListVisibility(false);
  }

  function hideOptions() {
    selectedListItemIndex = -1;
    if (options === undefined || options.length === 0) return;
    isActive = false;
    // options = [];
  }

  function performDefaultClickActions() {
    hideOptions();
    inputValue = "";
    focusOnInput();
    updateListVisibility(false);
  }

  function updateValues({ label, id }: { label: string; id: string }) {
    if (values.some((x) => x.id === id)) {
      values = values.filter((x) => x.id !== id);
    } else {
      values = [...values, { label, id }];
    }
  }

  function handleResultItemClick(detail: { label: string; id: string }) {
    dispatch("list-item-click", detail);
    updateValues(detail);
    performDefaultClickActions();
    // if (!escapeDefaultClickBehaviour) {
    //   performDefaultClickActions();
    // }
  }

  function handleResultItemClickViaCustomEvent({ detail }: CustomEvent) {
    console.log(detail);
    handleResultItemClick(detail);
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
      if (selectedListItemIndex > 0) {
        selectedListItemIndex--;
      }
    }
    if (event.key === "Enter") {
      if (selectedListItemIndex > -1) {
        const { label: title, id } = tempOptions[selectedListItemIndex];
        handleResultItemClick({ label, id });
        performDefaultClickActions();
        // if (!escapeDefaultClickBehaviour) {
        //   performDefaultClickActions();
        // }
      }
    }
  }

  function updateListVisibility(value: boolean) {
    isListVisible = value;
  }

  // function getStateWiseStyles() {
  //   if (isActive) {
  //     if (classList.active) return classList.active;
  //     if (
  //       inputStyle === TextInputStyle.WITH_BACKGROUND ||
  //       inputStyle === TextInputStyle.OUTLINED
  //     ) {
  //       return `outline-2 outline-aps1`;
  //     } else {
  //       return `border-none outline-none`;
  //     }
  //   } else if (classList.inactive) return classList.inactive;
  //   else if (inputStyle === TextInputStyle.WITH_BACKGROUND) {
  //     return `focus:outline-aps1`;
  //   } else if (inputStyle === TextInputStyle.OUTLINED) {
  //     return `outline outline-2 outline-brs3 focus:outline-aps1`;
  //   } else {
  //     return `border-none outline-none`;
  //   }
  // }

  // this is used to filter the options based on the input value
  $: {
    selectedListItemIndex = -1;
    if (!inputValue) {
      tempOptions = options;
    }
    if (
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

  onMount(() => {
    // this is taken from the TextInput.svelte component, because we want it look exactly like the text input, so we are using the same logic, but some of the parts has been changes, like how the focus state will be achieved, and how the outline will be applied

    let colors = resolveBackgroundClass(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    if (
      inputStyle == TextInputStyle.PLAIN ||
      inputStyle == TextInputStyle.OUTLINED
    ) {
      defaultInputClasses += " bg-transparent";
    } else if (inputStyle === TextInputStyle.WITH_BACKGROUND) {
      defaultInputClasses += ` bg-${backgroundColor} outline outline-1 p-2`;
    }
    if (inputStyle === TextInputStyle.OUTLINED)
      defaultInputClasses += ` outline outline-1 p-2`;

    if (size == Size.xl) defaultInputClasses += " text-h3";
    else if (size == Size.lg) defaultInputClasses += " text-base";
    else if (size == Size.md) defaultInputClasses += " text-base";
    else if (size == Size.sm) defaultInputClasses += " text-b2";
    else if (size == Size.xs) defaultInputClasses += " text-b3";
  });

  appEvents.subscribe((x: AppEventType) => {
    if (
      x.event === AppEvent.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `#${wrapperId}`, actionsWhenClickOutside);
    }
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->

<div id={wrapperId} class="relative w-full">
  <div class="relative flex flex-col gap-1 w-full items-start">
    <FormControlLabel {label} forId={id} />
    <div
      tabindex="0"
      on:click={() => {
        toggleActiveState(true);
        updateListVisibility(true);
      }}
      on:keydown={(e) => {
        if (e.key === "Enter") {
          toggleActiveState(true);
        }
      }}
      class="{'w-full flex flex-wrap p-2 gap-1'} {defaultInputClasses} outline-2 {isFocusing
        ? 'outline-aps1'
        : 'outline-brs3'}"
    >
      {#each values as value}
        <Chip on:click hideCloseIcon variant={chipsVariant}>{value.label}</Chip>
      {/each}
      <input
        {id}
        on:focusin={() => {
          toggleActiveState(true);
          updateListVisibility(true);
        }}
        type="text"
        {placeholder}
        bind:value={inputValue}
        on:input|stopPropagation
        on:focus={() => {
          isFocusing = true;
        }}
        on:focusout={() => {
          isFocusing = false;
        }}
        on:keydown|stopPropagation={handleKeyDownInDropdown}
        class="bg-transparent pl-1 py-1 text-base min-w-[100px] flex-1 outline-none"
        aria-label="Search"
        aria-describedby="search-addon"
      />
    </div>
  </div>
  {#if tempOptions && tempOptions.length > 0 && isListVisible}
    <!-- mt-1 is given because of the outline, since the outline is not the part of box model, it takes up extra space causing the overlap between outline, and the below list-->
    <div
      style={listContainerStyle}
      class={`absolute w-full z-[10] mt-1 max-h-[10rem] overflow-auto ${listContainerClassList}`}
    >
      {#each tempOptions as listItem, index}
        <AutocompleteResultItem
          {...listItem}
          isSelected={values.some((x) => x.id === listItem.id)}
          isActive={selectedListItemIndex === index}
          style={listItemStyle}
          on:click={handleResultItemClickViaCustomEvent}
        />
      {/each}
    </div>
  {/if}
</div>
