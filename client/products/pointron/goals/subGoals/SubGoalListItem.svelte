<script lang="ts">
  import type { Goal } from "$lib/client/types/pointron/goal.type";
  import { GeneralVariants } from "$lib/client/types/generalVariants.enum";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";

  export let variant: GeneralVariants = GeneralVariants.NORMAL;
</script>

<!-- <button
  on:click
  class={`w-full py-2 px-5 text-left text-base bg-none ${
    GeneralVariants.ADD === variant ? `text-fgs2` : `text-fgs1`
  }`}
  activeColor={`rgba(var(--colors-bgs3))`}
  hoverStyle={SelectionItemActiveStyle.BG_COLOR}
>
  <slot />
</button> -->

<button
  on:click
  class={`w-full py-2 px-5 text-left text-base bg-none hover:bg-bgs3 rounded-sm ${
    GeneralVariants.ADD === variant ? `text-fgs2` : `text-fgs1`
  }`}
>
  <slot />
</button>
