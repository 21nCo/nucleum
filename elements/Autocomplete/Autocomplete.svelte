<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import AutocompleteResultItem from "./AutocompleteResultItem.svelte";
  import type { AutocompleteListItemType } from "$lib/tidy/types/autocompleteListItem.type";
  import Search from "$lib/tidy/icons/Search.svelte";
  import { pointronEvents } from "$lib/local/stores/local.store";
  import type { PointronEvent } from "$lib/local/types/pointronEvent.type";
  import { PointronEventEnum } from "$lib/local/types/pointronEvent.enum";
  import { actIfClickedOutside } from "$lib/local/utils/local.utils";
  import { generateUID } from "$lib/tidy/utils/utils";

  export let wrapperClassList: string = "w-full";
  export let wrapperStyle: string = "";
  export let inputClassList: string = "";
  export let inputStyle: string = "";
  export let listContainerClassList: string = "";
  export let listContainerStyle: string = "";
  export let listItemClassList: string = "";
  export let listItemStyle: string = "";
  export let activeListItemClassList: string = "bg-bgs3";

  export let escapeDefaultClickBehaviour: boolean = false; // this is used to escape the default behaviour of the list item click, if this is true then the default behaviour of the list item click will not be performed, for example if you don't want to hide the list on list item click then set this to true

  export let hideSearchIcon: boolean = false;
  export let icon: string = "";
  export let customIconPath: string = ""; // customIconPath should be relative to the folder in which tidy folder is present, so if tidy folder is present in src/lib then customIconPath should be relative to src/lib folder like ./folderOrFileInsideLibFolder

  export let list: AutocompleteListItemType[] = [];

  export let placeholder: string = "";
  export let value: string;

  const dispatch = createEventDispatcher();
  const containerId = generateUID();
  let iconComponent: typeof SvelteComponent | undefined;
  let selectedListItemIndex: number = -1;

  function hideList() {
    selectedListItemIndex = -1;
    if (list === undefined || list.length === 0) return;
    list = [];
  }

  function performDefaultClickActions() {
    hideList();
  }

  function handleResultItemClick({ detail }: CustomEvent) {
    dispatch("list-item-click", detail);
    if (!escapeDefaultClickBehaviour) {
      performDefaultClickActions();
    }
  }

  function handleKeyDownInDropdown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      hideList();
    }
    if (event.key === "ArrowDown") {
      if (selectedListItemIndex < list.length - 1) {
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
        const { title, id } = list[selectedListItemIndex];
        dispatch("list-item-click", { title, id });
        if (!escapeDefaultClickBehaviour) {
          performDefaultClickActions();
        }
      }
    }
  }

  onMount(async () => {
    // if icon is present then dynamically import it from the tidy icon folder or from the customIconPath
    try {
      if (icon) {
        const { default: Icon } = await import(
          `${
            customIconPath
              ? `../../../${customIconPath}`
              : `../../../tidy/icons`
          }/${icon}.svelte`
        );
        iconComponent = Icon;
      }
    } catch (err) {
      console.log(err);
    }
  });

  pointronEvents.subscribe((x: PointronEvent) => {
    if (
      x.event === PointronEventEnum.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `#${containerId}`, hideList);
    }
  });
</script>

<div
  id={containerId}
  style={wrapperStyle}
  class={`relative ${wrapperClassList}`}
>
  <div class="realtive flex items-center">
    {#if icon || !hideSearchIcon}
      <!-- Search as a fallback component just in case iconComponent is not found -->
      <div
        class="absolute ml-2.5 min-w-[1rem] flex justify-center items-center w-4 h-4"
      >
        <!-- Here if searchIconHidden is true and icon is provided but the dynamic import does not result in a component then there is a fallback of Search Icon -->
        {#if icon}
          <svelte:component this={iconComponent || Search} />
        {:else if !hideSearchIcon}
          <Search />
        {/if}
      </div>
    {/if}

    <input
      style={inputStyle}
      type="text"
      bind:value
      on:input
      on:focus
      on:keydown={handleKeyDownInDropdown}
      class={`outline-none w-full py-2 px-2.5 text-b2 ${
        hideSearchIcon && !icon ? `` : `pl-8`
      } ${inputClassList}`}
      {placeholder}
      aria-label="Search"
      aria-describedby="search-addon"
    />
  </div>
  {#if list && list.length > 0}
    <div
      style={listContainerStyle}
      class={`absolute w-full z-[10] max-h-[10rem] overflow-auto ${listContainerClassList}`}
    >
      {#each list as listItem, index}
        <AutocompleteResultItem
          {...listItem}
          classList={listItemClassList}
          isActive={selectedListItemIndex === index}
          style={listItemStyle}
          activeClassList={activeListItemClassList}
          on:click={handleResultItemClick}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- 
  Note: Just need to implement on thing, which is if we navigate through the list using arrow keys then the list should scroll automatically to the selected item
 -->
