<script lang="ts">
  import { TextType } from "$lib/tidy/types/text.enum";
  import { onMount } from "svelte";
  import Element from "../Element.svelte";
  export let style: TextType;
  export let additionalClassList: string | undefined = "";
  let classList: string = "";
  onMount(() => {
    switch (style) {
      case TextType.PAGE_HEADING:
        classList += " text-accent1 bg-none text-h1 my-4";
        break;
      case TextType.PANEL_HEADING:
        classList += " text-h3 font-medium p-2 bg-none ";
        break;
      case TextType.SECTION_DESCRIPTION:
        classList += " text-fgs3";
        break;
      case TextType.SECTION_HEADING:
        classList += " text-fgs2 font-medium text-base max-w-3xl bg-none";
        break;
      case TextType.FORM_LABEL:
        classList += " text-fgs2 font-medium text-b3 max-w-3xl bg-none";
        break;
    }
  });
</script>

<Element
  classList={`${classList} ${additionalClassList}`}
  isAction={false}
  isForDebug={true}
>
  <slot />
</Element>
