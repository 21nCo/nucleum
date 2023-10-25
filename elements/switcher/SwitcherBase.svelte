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
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: string | undefined = undefined;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let parentBackgroundIndex: number = 1;
  let activeBackgroundColor: string = "";
  let backgroundColor: string = "";
  $: if (classList.includes("bg-")) backgroundColor = "";
  $: defaultActiveColor = retrieveCurrentColors($userPreferences).a1;
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

{#if selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND}
  <button
    class={classList + (isActive ? " text-bgs1" : " bg-bgs2 hover:bg-bgs3")}
    style={isActive
      ? `;background-color: ${activeColor ?? defaultActiveColor}`
      : ""}
    disabled={isDisabled}
    on:click
    on:pointerenter
  >
    <slot />
  </button>
{:else if selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR}
  <button
    class={classList}
    on:click
    on:pointerenter
    style={isActive && selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
      ? `;color: ${activeColor ?? defaultActiveColor}`
      : ""}
    disabled={isDisabled}
  >
    <slot />
  </button>
{:else}
  <button
    class={classList + (isActive ? " bg-bgs3" : " bg-bgs2 hover:bg-bgs3")}
    on:click
    on:pointerenter
    {id}
    style={isActive && selectionStyle === SelectionItemActiveStyle.SIDEBAR
      ? `;background-color: ${activeColor ?? defaultActiveColor}`
      : ""}
    disabled={isDisabled}
  >
    <slot />
    {#if selectionStyle === SelectionItemActiveStyle.SIDEBAR && isActive}
      <div
        class="absolute w-0.5 opacity-80 h-3/4 rounded-md z-20"
        style=" top: 12.5%; left: -2px; background-color: {activeColor ??
          defaultActiveColor}"
      />
    {/if}
  </button>
{/if}
