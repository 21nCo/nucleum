<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    SelectionItemActiveStyle,
    SwitcherStyle,
  } from "$lib/tidy/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SwitchItem from "./SwitchItem.svelte";
  import FormControlLabel from "../text/FormControlLabel.svelte";
  import {
    generateBackgroudColor,
    retrieveCurrentColors,
  } from "$lib/tidy/utils/utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";

  const dispatch = createEventDispatcher();
  export let items: string[];
  export let selectedIndex: number | undefined = undefined;
  export let size: Size = Size.md;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.UNKNOWN;
  export let parentBackgroundIndex: number = 1;
  export let style: SwitcherStyle = SwitcherStyle.HorizontalAndWraps;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let activeColor: string | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let wrapperClassList: string = "";
  export let wrapperStyle: string = "";
  let backgroundColor: string = "";
  let classList: string;
  onMount(() => {
    if (selectedIndex === undefined) selectedIndex = 0;
    let colors = generateBackgroudColor(parentBackgroundIndex);
    let currentColors = retrieveCurrentColors($userPreferences);
    if (!activeColor && currentColors) activeColor = currentColors.a1;
    backgroundColor = colors.backgroundColor;
  });
  function handleClick(event: any) {
    let selectedMenuItem = event.detail.item;
    selectedIndex = items.indexOf(selectedMenuItem!);
    dispatch("switch", { selected: selectedIndex });
  }
  onMount(() => {
    switch (style) {
      case SwitcherStyle.Vertical:
        classList = "flex justify-start items-stretch flex-col gap-2";
        selectionStyle =
          selectionStyle === SelectionItemActiveStyle.UNKNOWN
            ? SelectionItemActiveStyle.CIRCLE
            : selectionStyle;
        break;
      case SwitcherStyle.Horizontal:
        classList = "flex w-full pb-2 gap-2";
        selectionStyle =
          selectionStyle === SelectionItemActiveStyle.UNKNOWN
            ? SelectionItemActiveStyle.SIDEBAR
            : selectionStyle;
        break;
      case SwitcherStyle.HorizontalAndWraps:
        if (selectionStyle === SelectionItemActiveStyle.BOTTOMBAR) {
          classList = "flex flex-wrap items-center w-full";
        } else if (
          selectionStyle === SelectionItemActiveStyle.ACCENTROUNDEDBACKGROUND
        ) {
          classList = "flex flex-wrap w-full rounded-full" + backgroundColor;
        } else {
          classList = "flex gap-2 flex-wrap w-full pb-2";
          selectionStyle =
            selectionStyle === SelectionItemActiveStyle.UNKNOWN
              ? SelectionItemActiveStyle.SIDEBAR
              : selectionStyle;
        }

        break;
      default:
    }
  });
</script>

<div
  style={wrapperStyle}
  class={`flex flex-col h-full gap-2 justify-center items-center ${wrapperClassList}`}
>
  {#if label}
    <div class="self-start">
      <FormControlLabel {label} {info} />
    </div>
  {/if}
  {#if selectionStyle === SelectionItemActiveStyle.ACCENTROUNDEDBACKGROUND}
    <div class={classList}>
      {#each items as item, index}
        <button
          on:click={() => {
            handleClick({ detail: { item } });
          }}
          class="flex rounded-full gap-2 py-3 px-4 {backgroundColor}"
          style={selectedIndex === index
            ? `background-color: ${activeColor};`
            : ""}
        >
          {item}
        </button>
      {/each}
    </div>
  {:else}
    <div class={classList}>
      {#each items as item, index}
        <SwitchItem
          {selectionStyle}
          {parentBackgroundIndex}
          {size}
          {item}
          {activeColor}
          isActive={selectedIndex === index}
          on:click={handleClick}
          isDisabled={isDisableEnabled && selectedIndex !== index}
        />
      {/each}
    </div>
  {/if}
</div>
