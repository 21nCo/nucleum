<script lang="ts">
  import { onMount } from "svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import {
    bgClass,
    customColorStyle,
    resolveBackgroundClass
  } from "$lib/tidy/utils/theme.utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { ColorType } from "$lib/tidy/types/appearance.type";
  import ActiveBackgroundElement from "../style/ActiveBackgroundElement.svelte";
  import appearance from "$lib/tidy/stores/appearance.store";
  export let classList: string;
  export let id: string = "";
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: number | undefined = undefined;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let parentBackgroundIndex: number = 1;
  let activeBackgroundColor: string = "";
  let backgroundColor: string = "";
  $: if (classList.includes("bg-")) backgroundColor = "";
  $: activeBgStyle = customColorStyle(
    $appearance,
    ColorType.Bg,
    "aps1",
    activeColor
  );
  onMount(() => {
    let colors = resolveBackgroundClass(parentBackgroundIndex);
    activeBackgroundColor = colors.activeBackgroundColor;
    //if (isForDebug) console.log({ classList, backgroundColor });
    if (!classList.includes("bg-")) backgroundColor = colors.backgroundColor;
    if (
      selectionStyle === SelectionItemActiveStyle.SIDEDOT ||
      selectionStyle === SelectionItemActiveStyle.BOTTOMDOT
    ) {
      activeBackgroundColor = "";
    }
  });
</script>

{#if selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND}
  <ActiveBackgroundElement
    {classList}
    isBackgroundActive={isActive}
    bgWhenInactive={parentBackgroundIndex + 1}
    on:click
    on:pointerenter
  >
    <slot />
  </ActiveBackgroundElement>
{:else if selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR}
  <button
    class={classList}
    on:click
    on:pointerenter
    style={isActive && selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
      ? `;${customColorStyle($appearance, ColorType.Fg, "aps1", activeColor)}`
      : ""}
    disabled={isDisabled}
  >
    <slot />
  </button>
{:else if selectionStyle === SelectionItemActiveStyle.CIRCLE}
  <button class={classList} on:click on:pointerenter disabled={isDisabled}>
    <slot />
  </button>
{:else}
  <button
    class={classList + (isActive ? " bg-bgs3" : " bg-bgs2 hover:bg-bgs3")}
    on:click
    on:pointerenter
    {id}
    style={isActive && selectionStyle === SelectionItemActiveStyle.SIDEBAR
      ? `;${activeBgStyle}`
      : ""}
    disabled={isDisabled}
  >
    <slot />
    {#if selectionStyle === SelectionItemActiveStyle.SIDEBAR && isActive}
      <div
        class="absolute w-0.5 opacity-80 h-3/4 rounded-md z-20"
        style=" top: 12.5%; left: -2px; {activeBgStyle}"
      />
    {/if}
  </button>
{/if}
