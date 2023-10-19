<script lang="ts">
  import { onMount } from "svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { generateBackgroudColor } from "$lib/tidy/utils/utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { AppTheme } from "../types/theme.type";
  export let classList: string;
  export let styleList: string = "";
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let parentBackgroundIndex: number = 1;
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

<div
  class={classList +
    ($userPreferences.theme == AppTheme.Glassy
      ? " glassactive"
      : backgroundColor)}
  style={styleList}
>
  <slot />
</div>

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
