<script lang="ts">
  import { onMount } from "svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import {
    generateBackgroudColor,
    retrieveCurrentColors,
  } from "$lib/tidy/utils/utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  export let classList: string;
  export let id: string = "";
  export let styleList: string = "";
  export let isAction: boolean = true;
  //export let isMenuItem: boolean = false;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: string | undefined = undefined;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let hoverStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let parentBackgroundIndex: number = 1;
  export let isForDebug: boolean = false;
  let activeBackgroundColor: string = "";
  let backgroundColor: string = "";
  $: if (classList.includes("bg-")) backgroundColor = "";
  $: currentColors = retrieveCurrentColors($userPreferences);
  $: defaultActiveColor = currentColors?.accent1;

  onMount(() => {
    let colors = generateBackgroudColor(parentBackgroundIndex);
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

{#if isAction}
  <button
    class={classList +
      (hoverStyle === SelectionItemActiveStyle.ACCENT_COLOR
        ? " hover:text-accent1"
        : hoverStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND
        ? " hover:bg-accent1 hover:text-bgs1"
        : hoverStyle === SelectionItemActiveStyle.BG_COLOR && !isActive
        ? " hover:bg-bgs3 hover:text-fgs1"
        : "") +
      ($userPreferences.theme == "Colorful"
        ? selectionStyle != SelectionItemActiveStyle.SIDEDOT
          ? isActive
            ? selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND
              ? " bg-accent1 text-bgs1"
              : " glassactive"
            : selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND
            ? ""
            : " glass"
          : ""
        : $userPreferences.theme == "Clean"
        ? isActive
          ? selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND ||
            selectionStyle === SelectionItemActiveStyle.SIDEBAR
            ? " text-bgs1 rounded-md"
            : selectionStyle === SelectionItemActiveStyle.SIDEDOT ||
              selectionStyle === SelectionItemActiveStyle.BOTTOMDOT ||
              selectionStyle === SelectionItemActiveStyle.BOTTOMBAR ||
              selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
            ? " rounded-md"
            : activeBackgroundColor + " rounded-md"
          : selectionStyle === SelectionItemActiveStyle.BOTTOMBAR
          ? ""
          : backgroundColor +
            " rounded-md " +
            " hover:" +
            activeBackgroundColor?.trim()
        : "") +
      (isDisabled ? " opacity-50" : "")}
    on:click
    on:pointerenter
    {id}
    style={styleList +
      (isActive &&
      (selectionStyle === SelectionItemActiveStyle.SIDEDOT ||
        selectionStyle === SelectionItemActiveStyle.BOTTOMDOT ||
        selectionStyle === SelectionItemActiveStyle.BOTTOMBAR ||
        selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR)
        ? "color: " + activeColor ?? defaultActiveColor
        : isActive &&
          (selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND ||
            selectionStyle === SelectionItemActiveStyle.SIDEBAR)
        ? `;background-color: ${activeColor ?? defaultActiveColor}`
        : "")}
    disabled={isDisabled}
  >
    <slot />
    {#if selectionStyle === SelectionItemActiveStyle.SIDEBAR && isActive}
      <div
        class="absolute w-0.5 opacity-80 h-3/4 rounded-md z-20"
        style=" top: 12.5%; left: -2px; background-color: {activeColor ??
          defaultActiveColor}"
      />
    {:else if selectionStyle === SelectionItemActiveStyle.SIDEDOT && isActive}
      <div
        class="absolute opacity-80 w-2 rounded-full"
        style="height: 20%; top: 40%; left: -2px; background-color: {activeColor ??
          defaultActiveColor}"
      />
    {:else if selectionStyle === SelectionItemActiveStyle.BOTTOMDOT && isActive}
      <div
        class="absolute opacity-80 w-4 rounded-lg"
        style="height: 5%; left: 40%; background-color: {activeColor ??
          defaultActiveColor}"
      />
    {:else if selectionStyle === SelectionItemActiveStyle.BOTTOMBAR}
      {#if isActive}
        <div
          class="absolute opacity-80 w-full rounded-lg left-0 bottom-0"
          style="height: 5%; background-color: {activeColor ??
            defaultActiveColor}"
        />
      {:else}
        <div
          class="absolute opacity-80 w-full bg-bgs3 left-0 bottom-0"
          style="height: 5%;"
        />
      {/if}
    {/if}
  </button>
{:else}
  <div
    class={classList +
      ($userPreferences.theme == "Colorful" ? " glassactive" : backgroundColor)}
    style={styleList}
  >
    <slot />
  </div>
{/if}

<style>
  .glass {
    background: rgba(180, 180, 191, 0.2);
    /* border: 1px solid white; */
    backdrop-filter: blur(5px);
  }
  .glassactive {
    background: rgba(218, 218, 228, 0.2);
    /* border: 1px solid white; */
    backdrop-filter: blur(25px);
  }
</style>
