<script lang="ts">
  import { TextType } from "$lib/tidy/types/text.enum";
  import { onMount } from "svelte";
  export let style: TextType;
  export let customStyle: string = "";
  export let additionalClassList: string | undefined = "";
  let classList: string = "";
  onMount(() => {
    switch (style) {
      case TextType.PAGE_HEADING:
        classList += " text-a1 bg-none text-h1 my-4";
        break;
      case TextType.PANEL_HEADING:
        classList += " text-h3 font-medium bg-none ";
        break;
      case TextType.SECTION_DESCRIPTION:
        classList += " text-fgs3";
        break;
      case TextType.SECTION_HEADING:
        classList += " text-fgs3 font-medium text-b2 max-w-3xl bg-none";
        break;
      case TextType.FORM_LABEL:
        classList += " text-fgs2 font-medium text-b3 max-w-3xl bg-none";
        break;
    }
  });
</script>

<button style={customStyle} class={`${classList} ${additionalClassList}`}>
  <slot />
</button>
