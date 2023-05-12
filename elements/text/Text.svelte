<script lang="ts">
  import { TextType } from "$lib/tidy/types/text.enum";
  import { onMount } from "svelte";
  import Element from "../Element.svelte";
  export let type: TextType;
  let classList: string = "w-full ";
  onMount(() => {
    switch (type) {
      case TextType.PAGE_HEADING:
        classList += " text-accent1 bg-none text-h1 my-10";
        break;
      case TextType.SECTION_HEADING:
        classList += " text-fgs3 font-bold p-2 my-6 max-w-3xl";
        break;
      case TextType.SECTION_DESCRIPTION:
        classList += " text-fgs3";
        break;
    }
  });
</script>

<Element {classList} isAction={false} isForDebug={true}>
  <slot />
</Element>
