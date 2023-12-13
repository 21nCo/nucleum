<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import { onMount } from "svelte";
  export let content: string;
  export let style: TextStyle;
  export let customStyle: string = "";
  export let width: string = "";
  let classList: string = "";
  onMount(() => {
    switch (style) {
      case TextStyle.PAGE_HEADING:
        classList +=
          "  bg-none text-h1 font-medium" +
          (!$userPreferences.colorScheme.isDarkVariantTwo ? " text-a1" : "");
        break;
      case TextStyle.PANEL_HEADING:
        classList += " text-h4 font-medium text-fgs2 bg-none ";
        break;
      case TextStyle.SECTION_DESCRIPTION:
        classList += " text-fgs3";
        break;
      case TextStyle.SECTION_HEADING:
        classList += " text-fgs3 font-semibold text-b2 max-w-3xl bg-none";
        break;
      case TextStyle.FORM_LABEL:
        classList += " text-fgs2 font-medium text-b3 max-w-3xl bg-none";
        break;
    }
    classList += ` ${width} `;
  });
</script>

<button style={customStyle} class={`${classList}`}>
  {#if style === TextStyle.SECTION_HEADING}
    {content.toUpperCase()}
  {:else}
    {properCase(content)}
  {/if}
  <!-- <slot /> -->
</button>
