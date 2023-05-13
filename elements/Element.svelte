<script lang="ts">
  import { onMount } from "svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { generateBackgroudColor } from "$lib/tidy/utils/utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  export let classList: string;
  export let id: string = "";
  export let styleList: string = "";
  export let isAction: boolean = true;
  //export let isMenuItem: boolean = false;
  export let isActive: boolean = false;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let parentBackgroundIndex: number = 1;
  export let isForDebug: boolean = false;
  let activeBackgroundColor: string = "";
  let backgroundColor: string = "";
  $: if (classList.includes("bg-")) backgroundColor = "";
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
          ? selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND
            ? " bg-accent1 text-bgs1"
            : selectionStyle === SelectionItemActiveStyle.SIDEDOT ||
              selectionStyle === SelectionItemActiveStyle.BOTTOMDOT ||
              selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
            ? " text-accent1"
            : activeBackgroundColor
          : selectionStyle === SelectionItemActiveStyle.SIDEDOT ||
            selectionStyle === SelectionItemActiveStyle.BOTTOMDOT ||
            selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
          ? ""
          : backgroundColor + " hover:" + activeBackgroundColor?.trim()
        : "")}
    on:click
    on:pointerenter
    {id}
    style={styleList}
  >
    <slot />
    {#if selectionStyle === SelectionItemActiveStyle.SIDEBAR && isActive}
      <div
        class="absolute w-0.5 opacity-80 h-3/4 bg-fgs2 rounded-md z-20"
        style=" top: 12.5%; left: -2px"
      />
    {:else if selectionStyle === SelectionItemActiveStyle.SIDEDOT && isActive}
      <div
        class="absolute opacity-80 w-2 rounded-full bg-accent1"
        style="height: 20%; top: 40%; left: -2px"
      />
    {:else if selectionStyle === SelectionItemActiveStyle.BOTTOMDOT && isActive}
      <div
        class="absolute opacity-80 w-4 rounded-lg bg-accent1"
        style="height: 5%; left: 40%;"
      />
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
