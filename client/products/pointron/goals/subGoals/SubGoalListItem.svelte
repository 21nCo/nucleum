<script lang="ts">
  import { GeneralVariants } from "$lib/client/types/generalVariants.enum";

  export let variant: GeneralVariants = GeneralVariants.NORMAL;
</script>

<button
  on:click
  class={`w-full py-2 px-5 text-left text-base bg-none hover:bg-bgs3 rounded-sm ${
    GeneralVariants.ADD === variant ? `text-fgs2` : `text-fgs1`
  }`}
>
  <slot />
</button>
