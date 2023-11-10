<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import AutocompleteResultItem from "./AutocompleteResultItem.svelte";
  import type { AutocompleteListItemType } from "$lib/tidy/types/autocompleteListItem.type";
  import Search from "$lib/tidy/icons/Search.svelte";
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import TextInput from "../input/TextInput.svelte";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import { Item } from "$lib/tidy/types/item.enum";
  import Chip from "./Chip.svelte";
  import { ChipVariant } from "$lib/tidy/types/chipVariant.enum";
  import { TextInputVariant } from "$lib/tidy/types/textInputVariant.enum";
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { appEvents } from "$lib/tidy/stores/app.store";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { generateBackgroudColor } from "$lib/tidy/utils/theme.utils";

  export let wrapperClassList: string = "w-full";
  export let wrapperStyle: string = "";
  export let style: string = "";
  export let listContainerClassList: string = "bg-bgs2 shadow-sm shadow-fgs3";
  export let listContainerStyle: string = "";
  export let listItemStyle: string = "";
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let inputStyle: TextInputStyle = TextInputStyle.OUTLINED;
  export let chipsClassList: string = "";

  export let isListVisible: boolean = false;

  export let mobileInputClassList: ClassListProp = {
    active: "",
    inactive: "",
    common: "",
  };
  export let classList: ClassListProp = {
    active: "",
    inactive: "",
    common: "",
  };
  export let listItemClassList: ClassListProp = {
    active: "bg-bgs2",
    inactive: "",
    common: "",
    selected: "bg-bgs2",
  };
  export let containerClassList: ClassListProp = {
    active: "",
    inactive: "",
    common: "",
  }; // this is for the container, which contains label, and the input field not the list

  export let escapeDefaultClickBehaviour: boolean = false; // this is used to escape the default behaviour of the list item click, if this is true then the default behaviour of the list item click will not be performed, for example if you don't want to hide the list on list item click then set this to true

  export let options: AutocompleteListItemType[] = [];

  export let placeholder: string = "";
  export let values: AutocompleteListItemType[] = [];
  export let label: string = "";
  export let chipsVariant: ChipVariant = ChipVariant.FILLED;

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

  function updateValues({ title, id }: { title: string; id: string }) {
    if (values.some((x) => x.id === id)) {
      values = values.filter((x) => x.id !== id);
    } else {
      values = [...values, { title, id }];
    }
  }

  function handleResultItemClick(detail: { title: string; id: string }) {
    dispatch("list-item-click", detail);
    updateValues(detail);
    if (!escapeDefaultClickBehaviour) {
      performDefaultClickActions();
      // because since there are chips, we don't want to hide the list on click, because the user might want to select multiple items
    }
  }

  function handleResultItemClickViaCustomEvent({ detail }: CustomEvent) {
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
        const { title, id } = tempOptions[selectedListItemIndex];
        handleResultItemClick({ title, id });
        if (!escapeDefaultClickBehaviour) {
          performDefaultClickActions();
        }
      }
    }
  }

  function updateListVisibility(value: boolean) {
    isListVisible = value;
  }

  function getStateWiseStyles() {
    if (isActive) {
      if (classList.active) return classList.active;
      if (
        inputStyle === TextInputStyle.BOXED ||
        inputStyle === TextInputStyle.OUTLINED
      ) {
        return `outline-a1`;
      } else {
        return `border-none outline-none`;
      }
    } else if (classList.inactive) return classList.inactive;
    else if (inputStyle === TextInputStyle.BOXED) {
      return `outline-fgs3 focus:outline-a1`;
    } else if (inputStyle === TextInputStyle.OUTLINED) {
      return `outline-fgs3 focus:outline-a1`;
    } else {
      return `border-none outline-none`;
    }
  }

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
        x.title.toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  onMount(() => {
    // this is taken from the TextInput.svelte component, because we want it look exactly like the text input, so we are using the same logic, but some of the parts has been changes, like how the focus state will be achieved, and how the outline will be applied

    let colors = generateBackgroudColor(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    if (
      inputStyle == TextInputStyle.PLAIN ||
      inputStyle == TextInputStyle.OUTLINED
    ) {
      defaultInputClasses += " bg-transparent";
    } else if (inputStyle === TextInputStyle.BOXED) {
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

<div id={wrapperId} style={wrapperStyle} class={`relative ${wrapperClassList}`}>
  <div
    class={`relative flex flex-col gap-1 w-full items-start ${
      containerClassList.common
    } ${isActive ? containerClassList.active : containerClassList.inactive}`}
  >
    <label class="" for={id}>
      {label}
    </label>
    <!-- 
       isActive ? getStateWiseStyles() : getStateWiseStyles(), is written this way, because we want to call the function as soon as active state changes, but if we put the function call in the classList, then it will be called only once, and the classList will not be updated when the active state changes, so we are calling the function in the ternary operator, so that it is called everytime the active state changes, and the classList is updated accordingly
     -->
    <div
      tabindex="0"
      {style}
      on:click={() => {
        toggleActiveState(true);
        updateListVisibility(true);
      }}
      on:keydown={(e) => {
        if (e.key === "Enter") {
          toggleActiveState(true);
        }
      }}
      class={`mock-input-field w-full flex flex-wrap p-2 gap-1 ${defaultInputClasses} ${classList} ${
        isActive ? getStateWiseStyles() : getStateWiseStyles()
      }`}
    >
      {#each values as value}
        <Chip
          on:click
          hideCloseIcon
          classList={chipsClassList}
          variant={chipsVariant}>{value.title}</Chip
        >
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
        on:input
        on:focus
        on:keydown={handleKeyDownInDropdown}
        class={`bg-transparent pl-1 py-1 text-b3 min-w-[100px] flex-1 outline-none ${
          mobileInputClassList.common
        } ${
          isActive ? mobileInputClassList.active : mobileInputClassList.inactive
        }`}
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
          classList={listItemClassList}
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

    Basic terminologies used in this component:
    1. Wrapper: The main wrapper, which contains the label, and the input field, and the list
    2. Container: The container is the wrapper of the input field, and the label, and the list is not the part of the container
    3. List: The list is the list of the options, which is shown when the user clicks on the input field
    4. Input field: The input field is the input field, which is used to type the text
    5. List item: The list item is the item in the list, which is shown when the user clicks on the input field
    6. mobileInputClassList: This is the classList for the input field, which is used to style the input field which is mobile in nature, meaning which is moving in order to accommodate the chips
    7. classList: This is the classList for the input field, which is used to style the input field which is actually not an input field but is behaving like one, and is used to contains the chips along with the mobile input field
    8. listItemClassList: This is the classList for the list item, which is used to style the list item
    9. containerClassList: This is the classList for the container, which is used to style the container, which contains the label, and the input field not the list

 
-->
