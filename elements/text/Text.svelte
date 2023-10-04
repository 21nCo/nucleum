<script lang="ts">
  import { TextType } from "$lib/tidy/types/text.enum";
  import { onMount } from "svelte";
  export let style: TextType;
  let classList: string = "w-full ";
  onMount(() => {
    switch (style) {
      case TextType.PAGE_HEADING:
        classList += " text-accent1 bg-none text-h1 my-4";
        break;
      case TextType.PANEL_HEADING:
        classList += " text-h3 font-medium p-2 ";
        break;
      case TextType.SECTION_DESCRIPTION:
        classList += " text-fgs3";
        break;
      case TextType.SECTION_HEADING:
        classList += " text-fgs2 font-medium text-b2 max-w-3xl bg-none";
        break;
    }
  });
</script>

<div class={classList}>
  <slot />
</div>
