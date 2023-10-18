<script lang="ts">
  import { TextType } from "$lib/tidy/types/text.enum";
  import { onMount } from "svelte";
  import Element from "../Element.svelte";
  export let type: TextType;

  export let additionalClassList: string = "";
  export let style: string = "";
  let classList: string = `w-full`;

  onMount(() => {
    switch (type) {
      case TextType.PAGE_HEADING:
        classList += " text-accent1 bg-none text-h1 my-4";
        break;
      case TextType.SECTION_HEADING:
        classList += " text-fgs3 font-bold p-2 my-6 max-w-3xl";
        break;
      case TextType.SECTION_DESCRIPTION:
        classList += " text-fgs3";
        break;
      case TextType.CP_SECTION:
        classList += " text-fgs2 font-bold text-b2 max-w-3xl bg-none";
        break;
    }
  });
</script>

<Element
  styleList={style}
  classList={`${classList} ${additionalClassList}`}
  isAction={false}
  isForDebug={true}
>
  <slot />
</Element>
