<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    SelectionItemActiveStyle,
    SwitcherStyle,
  } from "$lib/tidy/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SwitchItem from "./SwitchItem.svelte";
  import {
    customColorStyle,
    generateBackgroudColor,
  } from "$lib/tidy/utils/theme.utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { ColorType } from "$lib/tidy/types/theme.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import FormControlLabelWrapper from "../input/FormControlLabelWrapper.svelte";
  import type { InfoTextParams } from "$lib/tidy/types/text.type";

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
  export let infoParams: InfoTextParams | undefined = undefined;
  export let activeColor: number | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let labelOrientation: Orientation = Orientation.Vertical;
  let backgroundColor: string = "";
  let classList: string;
  onMount(() => {
    if (selectedIndex === undefined) selectedIndex = 0;
    let colors = generateBackgroudColor(parentBackgroundIndex);
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
            ? SelectionItemActiveStyle.CIRCLE_WITH_BACKGROUND
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
          classList =
            "flex pb-2 " +
            (selectionStyle === SelectionItemActiveStyle.CIRCLE
              ? "gap-4 "
              : "gap-2 flex-wrap ");
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

<FormControlLabelWrapper
  {label}
  info={info ? { body: info } : infoParams}
  orientation={labelOrientation}
>
  {#if selectionStyle === SelectionItemActiveStyle.ACCENTROUNDEDBACKGROUND}
    <div class={classList}>
      {#each items as item, index}
        <button
          on:click={() => {
            handleClick({ detail: { item } });
          }}
          class="flex rounded-full gap-2 py-3 px-4 {backgroundColor}"
          style={selectedIndex === index
            ? customColorStyle(
                $userPreferences,
                ColorType.Bg,
                "a1",
                activeColor
              )
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
</FormControlLabelWrapper>
